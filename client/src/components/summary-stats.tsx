import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, FileText, Percent, DollarSign, Calendar, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage, groupRecordsByMonth } from "@/lib/utils";
import { TrackingRecord, calculateBonus } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface SummaryStatsProps {
  records: TrackingRecord[];
}

// Editable Cell Component
interface EditableCellProps {
  value: number;
  recordId: number;
  field: 'scheduledCustomers' | 'reportedCustomers';
  onUpdate: (id: number, field: string, value: number) => void;
}

function EditableCell({ value, recordId, field, onUpdate }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  const handleSave = () => {
    const newValue = parseInt(editValue) || 0;
    if (newValue !== value) {
      onUpdate(recordId, field, newValue);
      toast({
        title: "Đã cập nhật",
        description: "Dữ liệu đã được lưu thành công!",
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };



  if (isEditing) {
    return (
      <Input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
          if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        className="w-16 h-6 text-center text-xs"
        autoFocus
        min="0"
      />
    );
  }

  return (
    <div 
      className="cursor-pointer hover:bg-blue-50 p-1 rounded border border-dashed border-gray-300 min-w-[30px] text-center text-xs font-medium transition-colors"
      onClick={() => setIsEditing(true)}
      title="Click để chỉnh sửa"
    >
      {value}
    </div>
  );
}

export function SummaryStats({ records }: SummaryStatsProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  
  // Get fresh data from query cache to ensure we have optimistic updates
  const freshRecords = queryClient.getQueryData<TrackingRecord[]>(["/api/tracking-records"]) || records;
  const monthlyData = groupRecordsByMonth(freshRecords);
  
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; field: string; value: number }) => {
      const updateData = { [data.field]: data.value };
      return await apiRequest(`/api/tracking-records/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });
    },
    onMutate: async (data) => {
      console.log('onMutate called with:', data);
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/tracking-records"] });

      // Snapshot the previous value
      const previousRecords = queryClient.getQueryData(["/api/tracking-records"]);
      console.log('Previous records:', previousRecords);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/tracking-records"], (oldRecords: any) => {
        if (!oldRecords) return oldRecords;
        const updatedRecords = oldRecords.map((record: any) => 
          record.id === data.id 
            ? { ...record, [data.field]: data.value }
            : record
        );
        console.log('Updated records:', updatedRecords);
        return updatedRecords;
      });

      // Return a context object with the snapshotted value
      return { previousRecords };
    },
    onError: (err, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRecords) {
        queryClient.setQueryData(["/api/tracking-records"], context.previousRecords);
      }
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể lưu dữ liệu. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-records"] });
    },
  });

  const handleCellUpdate = (id: number, field: string, value: number) => {
    console.log('Updating cell:', { id, field, value });
    updateMutation.mutate({ id, field, value });
  };
  
  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const calculateMonthStats = (monthRecords: TrackingRecord[]) => {
    return monthRecords.reduce(
      (acc, record) => {
        const { totalBonus } = calculateBonus(record.scheduledCustomers, record.reportedCustomers);
        return {
          totalScheduled: acc.totalScheduled + record.scheduledCustomers,
          totalReported: acc.totalReported + record.reportedCustomers,
          totalBonus: acc.totalBonus + totalBonus,
        };
      },
      { totalScheduled: 0, totalReported: 0, totalBonus: 0 }
    );
  };

  const overallTotals = records.reduce(
    (acc, record) => {
      const { totalBonus } = calculateBonus(record.scheduledCustomers, record.reportedCustomers);
      return {
        totalScheduled: acc.totalScheduled + record.scheduledCustomers,
        totalReported: acc.totalReported + record.reportedCustomers,
        totalBonus: acc.totalBonus + totalBonus,
      };
    },
    { totalScheduled: 0, totalReported: 0, totalBonus: 0 }
  );

  const overallAveragePercentage = overallTotals.totalScheduled > 0 
    ? (overallTotals.totalReported / overallTotals.totalScheduled) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Tổng Kết Chung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="text-blue-600 mr-3 h-6 w-6" />
                <div>
                  <p className="text-sm text-gray-600">Tổng Khách Hẹn</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(overallTotals.totalScheduled)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="text-green-600 mr-3 h-6 w-6" />
                <div>
                  <p className="text-sm text-gray-600">Tổng Report</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(overallTotals.totalReported)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Percent className="text-yellow-600 mr-3 h-6 w-6" />
                <div>
                  <p className="text-sm text-gray-600">Tỉ Lệ TB</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatPercentage(overallAveragePercentage)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="text-purple-600 mr-3 h-6 w-6" />
                <div>
                  <p className="text-sm text-gray-600">Tổng Thưởng</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(overallTotals.totalBonus)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng Kết Theo Tháng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {monthlyData.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có dữ liệu theo tháng</p>
          ) : (
            monthlyData.map((month) => {
              const monthStats = calculateMonthStats(month.records);
              const monthPercentage = monthStats.totalScheduled > 0 
                ? (monthStats.totalReported / monthStats.totalScheduled) * 100 
                : 0;
              const isExpanded = expandedMonths.has(month.monthKey);

              return (
                <Collapsible key={month.monthKey}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-gray-50"
                      onClick={() => toggleMonth(month.monthKey)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-left">
                          <p className="font-medium">{month.monthName}</p>
                          <p className="text-sm text-gray-500">{month.records.length} ngày làm việc</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">
                            {formatNumber(monthStats.totalScheduled)} khách hẹn
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            {formatNumber(monthStats.totalReported)} reports
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-600">
                            {formatPercentage(monthPercentage)}
                          </p>
                          <p className="text-sm font-medium text-purple-600">
                            {formatCurrency(monthStats.totalBonus)}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center">
                            <Users className="text-blue-600 mr-2 h-5 w-5" />
                            <div>
                              <p className="text-xs text-gray-600">Khách Hẹn</p>
                              <p className="text-lg font-bold text-blue-600">
                                {formatNumber(monthStats.totalScheduled)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center">
                            <FileText className="text-green-600 mr-2 h-5 w-5" />
                            <div>
                              <p className="text-xs text-gray-600">Reports</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatNumber(monthStats.totalReported)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <div className="flex items-center">
                            <Percent className="text-yellow-600 mr-2 h-5 w-5" />
                            <div>
                              <p className="text-xs text-gray-600">Tỉ Lệ</p>
                              <p className="text-lg font-bold text-yellow-600">
                                {formatPercentage(monthPercentage)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center">
                            <DollarSign className="text-purple-600 mr-2 h-5 w-5" />
                            <div>
                              <p className="text-xs text-gray-600">Thưởng</p>
                              <p className="text-lg font-bold text-purple-600">
                                {formatCurrency(monthStats.totalBonus)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Daily breakdown */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Chi tiết theo ngày:</h4>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {month.records.map((record) => {
                            const dailyBonus = calculateBonus(record.scheduledCustomers, record.reportedCustomers);
                            const dayName = new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'long' });
                            
                            return (
                              <div key={record.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
                                <span className="font-medium">
                                  {dayName} ({new Date(record.date).toLocaleDateString('vi-VN')})
                                </span>
                                <div className="flex space-x-4 text-xs items-center">
                                  <div className="flex items-center space-x-1">
                                    <EditableCell 
                                      value={record.scheduledCustomers} 
                                      recordId={record.id} 
                                      field="scheduledCustomers"
                                      onUpdate={handleCellUpdate}
                                    />
                                    <span className="text-blue-600">hẹn</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <EditableCell 
                                      value={record.reportedCustomers} 
                                      recordId={record.id} 
                                      field="reportedCustomers"
                                      onUpdate={handleCellUpdate}
                                    />
                                    <span className="text-green-600">reports</span>
                                  </div>
                                  <span className="text-yellow-600">{formatPercentage(dailyBonus.percentage)}</span>
                                  <span className="text-purple-600 font-medium">{formatCurrency(dailyBonus.totalBonus)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
