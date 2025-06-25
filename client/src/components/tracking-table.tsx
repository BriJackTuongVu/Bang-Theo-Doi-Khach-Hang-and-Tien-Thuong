import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  TrackingRecord, 
  InsertTrackingRecord, 
  calculateBonus, 
  BONUS_TIERS 
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatPercentage, getTodayDate } from "@/lib/utils";
import { 
  Plus, 
  Calendar, 
  Users, 
  FileText, 
  Percent, 
  DollarSign, 
  Trash2,
  Star,
  Award,
  Gem,
  Minus
} from "lucide-react";

const iconMap = {
  star: Star,
  award: Award,
  gem: Gem,
};

export function TrackingTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: records = [], isLoading } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTrackingRecord) => {
      const response = await apiRequest('POST', '/api/tracking-records', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracking-records'] });
      toast({
        title: "Thành công",
        description: "Đã thêm bản ghi mới",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể thêm bản ghi",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTrackingRecord> }) => {
      const response = await apiRequest('PATCH', `/api/tracking-records/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracking-records'] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật bản ghi",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tracking-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracking-records'] });
      toast({
        title: "Thành công",
        description: "Đã xóa bản ghi",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa bản ghi",
        variant: "destructive",
      });
    },
  });

  const handleAddRow = () => {
    createMutation.mutate({
      date: getTodayDate(),
      scheduledCustomers: 0,
      reportedCustomers: 0,
    });
  };

  const handleUpdateField = (
    id: number, 
    field: keyof InsertTrackingRecord, 
    value: string | number
  ) => {
    updateMutation.mutate({
      id,
      data: { [field]: value },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const getTierBadge = (percentage: number) => {
    if (percentage >= BONUS_TIERS.TIER_3.threshold) {
      const tier = BONUS_TIERS.TIER_3;
      const Icon = iconMap[tier.icon as keyof typeof iconMap];
      return (
        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <Icon className="inline mr-1 h-3 w-3" />
          {tier.label}
        </span>
      );
    } else if (percentage >= BONUS_TIERS.TIER_2.threshold) {
      const tier = BONUS_TIERS.TIER_2;
      const Icon = iconMap[tier.icon as keyof typeof iconMap];
      return (
        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
          <Icon className="inline mr-1 h-3 w-3" />
          {tier.label}
        </span>
      );
    } else if (percentage >= BONUS_TIERS.TIER_1.threshold) {
      const tier = BONUS_TIERS.TIER_1;
      const Icon = iconMap[tier.icon as keyof typeof iconMap];
      return (
        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          <Icon className="inline mr-1 h-3 w-3" />
          {tier.label}
        </span>
      );
    } else {
      return (
        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          <Minus className="inline mr-1 h-3 w-3" />
          Thấp
        </span>
      );
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Đang tải...</div>;
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Calendar className="inline mr-2 h-4 w-4" />
                  Ngày Tháng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Users className="inline mr-2 h-4 w-4" />
                  Số Lượng Khách Hẹn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <FileText className="inline mr-2 h-4 w-4" />
                  Số Lượng Khách Đưa Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Percent className="inline mr-2 h-4 w-4" />
                  Tỉ Lệ %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <DollarSign className="inline mr-2 h-4 w-4" />
                  Tiền Thưởng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => {
                const { percentage, totalBonus, bonusRate } = calculateBonus(
                  record.scheduledCustomers,
                  record.reportedCustomers
                );

                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="date"
                        value={record.date}
                        onChange={(e) => handleUpdateField(record.id, 'date', e.target.value)}
                        className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        value={record.scheduledCustomers}
                        onChange={(e) => {
                          const value = Math.max(0, parseInt(e.target.value) || 0);
                          handleUpdateField(record.id, 'scheduledCustomers', value);
                        }}
                        min="0"
                        className="w-20 border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        value={record.reportedCustomers}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(record.scheduledCustomers, parseInt(e.target.value) || 0));
                          handleUpdateField(record.id, 'reportedCustomers', value);
                        }}
                        min="0"
                        max={record.scheduledCustomers}
                        className="w-20 border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg font-semibold">
                          {formatPercentage(percentage)}
                        </span>
                        {getTierBadge(percentage)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`text-lg font-bold ${totalBonus > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {formatCurrency(totalBonus)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {totalBonus > 0 
                            ? `${formatCurrency(bonusRate)} × ${record.reportedCustomers} reports`
                            : "Chưa đạt mức tối thiểu"
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200">
          <Button 
            onClick={handleAddRow}
            disabled={createMutation.isPending}
            className="inline-flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm Dòng
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
