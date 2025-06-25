import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  TrackingRecord, 
  InsertTrackingRecord, 
  calculateBonus, 
  BONUS_TIERS 
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatPercentage, getTodayDate, getNextDate } from "@/lib/utils";
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
  Minus,
  Save,
  X
} from "lucide-react";

const iconMap = {
  star: Star,
  award: Award,
  gem: Gem,
};

export function TrackingTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: keyof InsertTrackingRecord;
    value: string | number;
    originalValue: string | number;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [pendingEdit, setPendingEdit] = useState<{id: number, field: string, value: any} | null>(null);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [tableName, setTableName] = useState("Bảng Theo Dõi Chính");
  const [isEditingName, setIsEditingName] = useState(false);
  
  const { data: records = [], isLoading } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTrackingRecord) => {
      const response = await apiRequest('POST', '/api/tracking-records', data);
      return response.json();
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracking-records'] });
      
      // Highlight the new row
      setHighlightedRow(newRecord.id);
      setTimeout(() => {
        setHighlightedRow(null);
      }, 2000);
      
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
      date: getNextDate(records),
      scheduledCustomers: 0,
      reportedCustomers: 0,
      closedCustomers: 0,
      paymentStatus: "chưa pay" as const,
    });
  };

  const handleStartEdit = (
    id: number,
    field: keyof InsertTrackingRecord,
    currentValue: string | number
  ) => {
    // Các trường cần xác nhận PIN
    if (field === 'closedCustomers' || field === 'paymentStatus') {
      setPendingEdit({ id, field: field as string, value: currentValue });
      setShowPinDialog(true);
      setPin("");
    } else {
      setEditingCell({
        id,
        field,
        value: currentValue,
        originalValue: currentValue,
      });
    }
  };

  const handlePinConfirm = () => {
    if (pin === "1995" && pendingEdit) {
      if (pendingEdit.field === 'delete') {
        // Xử lý xóa
        setPendingDelete(pendingEdit.id);
        setShowConfirmDialog(true);
      } else {
        // Xử lý chỉnh sửa
        setEditingCell({
          id: pendingEdit.id,
          field: pendingEdit.field as keyof InsertTrackingRecord,
          value: pendingEdit.value,
          originalValue: pendingEdit.value,
        });
      }
      setShowPinDialog(false);
      setPendingEdit(null);
      setPin("");
    } else {
      alert("Mã PIN không chính xác!");
      setPin("");
    }
  };

  const handlePinCancel = () => {
    setShowPinDialog(false);
    setPendingEdit(null);
    setPin("");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleConfirmEdit = () => {
    if (editingCell) {
      updateMutation.mutate({
        id: editingCell.id,
        data: { [editingCell.field]: editingCell.value },
      });
      setEditingCell(null);
    }
  };

  const handleInputChange = (value: string | number) => {
    if (editingCell) {
      setEditingCell({
        ...editingCell,
        value,
      });
    }
  };

  const handleDelete = (id: number) => {
    // Yêu cầu PIN trước khi xóa
    setPendingEdit({ id, field: 'delete', value: id });
    setShowPinDialog(true);
    setPin("");
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      deleteMutation.mutate(pendingDelete);
      setPendingDelete(null);
    }
    setShowConfirmDialog(false);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setShowConfirmDialog(false);
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
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex flex-col space-y-3">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingName(false);
                      }
                    }}
                    className="text-lg font-semibold border-0 p-0 h-auto focus:ring-0"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => setIsEditingName(false)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✓
                  </Button>
                </div>
              ) : (
                <div 
                  className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center gap-2"
                  onClick={() => setIsEditingName(true)}
                >
                  <span className="text-lg font-semibold">{tableName}</span>
                  <span className="text-sm text-gray-500">✎</span>
                </div>
              )}
            </div>
            <div className="text-sm font-normal text-gray-600 bg-blue-50 p-3 rounded-lg">
              <strong>Thang điểm tiền thưởng:</strong>
              <div className="mt-1 space-y-1">
                <div>• ≥30% report: <span className="font-semibold text-green-600">200,000 VND</span></div>
                <div>• ≥50% report: <span className="font-semibold text-green-600">300,000 VND</span></div>
                <div>• ≥70% report: <span className="font-semibold text-green-600">400,000 VND</span></div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Calendar className="inline mr-2 h-4 w-4" />
                  Ngày Tháng
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  <Users className="inline mr-1 h-3 w-3" />
                  Khách Hẹn
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  <FileText className="inline mr-1 h-3 w-3" />
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Percent className="inline mr-2 h-4 w-4" />
                  Tỉ Lệ %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <DollarSign className="inline mr-2 h-4 w-4" />
                  Tiền Thưởng
                </th>

                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tưởng Only
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng Thái
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
                  <tr 
                    key={record.id} 
                    className={`transition-all duration-500 ${
                      highlightedRow === record.id 
                        ? 'bg-green-100 animate-pulse border-2 border-green-300 shadow-lg' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {editingCell?.id === record.id && editingCell?.field === 'date' ? (
                          <>
                            <Input
                              type="date"
                              value={editingCell.value as string}
                              onChange={(e) => handleInputChange(e.target.value)}
                              className="border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleConfirmEdit}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(record.id, 'date', record.date)}
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded border-2 border-transparent hover:border-blue-200"
                          >
                            {record.date}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-20">
                      <div className="flex justify-center">
                        {editingCell?.id === record.id && editingCell?.field === 'scheduledCustomers' ? (
                          <>
                            <Input
                              type="number"
                              value={editingCell.value as number}
                              onChange={(e) => {
                                const value = Math.max(0, parseInt(e.target.value) || 0);
                                handleInputChange(value);
                              }}
                              min="0"
                              className="w-16 border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleConfirmEdit}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 ml-1"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(record.id, 'scheduledCustomers', record.scheduledCustomers)}
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded border-2 border-transparent hover:border-blue-200 text-center w-16"
                          >
                            {record.scheduledCustomers}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-20">
                      <div className="flex justify-center">
                        {editingCell?.id === record.id && editingCell?.field === 'reportedCustomers' ? (
                          <>
                            <Input
                              type="number"
                              value={editingCell.value as number}
                              onChange={(e) => {
                                const value = Math.max(0, Math.min(record.scheduledCustomers, parseInt(e.target.value) || 0));
                                handleInputChange(value);
                              }}
                              min="0"
                              max={record.scheduledCustomers}
                              className="w-16 border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleConfirmEdit}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 ml-1"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(record.id, 'reportedCustomers', record.reportedCustomers)}
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded border-2 border-transparent hover:border-blue-200 text-center w-16"
                          >
                            {record.reportedCustomers}
                          </div>
                        )}
                      </div>
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
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                        disabled={deleteMutation.isPending}
                        className="hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        {editingCell?.id === record.id && editingCell?.field === 'closedCustomers' ? (
                          <>
                            <Input
                              type="number"
                              value={editingCell.value as number}
                              onChange={(e) => {
                                const value = Math.max(0, parseInt(e.target.value) || 0);
                                handleInputChange(value);
                              }}
                              min="0"
                              className="w-16 border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleConfirmEdit}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 ml-1"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(record.id, 'closedCustomers', record.closedCustomers || 0)}
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded border-2 border-transparent hover:border-blue-200 text-center w-16 font-medium"
                          >
                            {record.closedCustomers || 0}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        {editingCell?.id === record.id && editingCell?.field === 'paymentStatus' ? (
                          <>
                            <select
                              value={editingCell.value as string}
                              onChange={(e) => handleInputChange(e.target.value)}
                              className="px-2 py-1 border border-blue-300 rounded text-xs"
                            >
                              <option value="chưa pay">chưa pay</option>
                              <option value="đã pay">đã pay</option>
                            </select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleConfirmEdit}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 ml-1"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <span 
                            onClick={() => handleStartEdit(record.id, 'paymentStatus', record.paymentStatus || "chưa pay")}
                            className={`cursor-pointer px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 ${
                              (record.paymentStatus || "chưa pay") === "đã pay" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {record.paymentStatus || "chưa pay"}
                          </span>
                        )}
                      </div>
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
        
        {/* Confirmation Dialog for Delete */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa bản ghi này? 
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>
                Hủy bỏ
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* PIN Confirmation Dialog */}
        <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận quyền chỉnh sửa</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingEdit?.field === 'delete' 
                  ? "Nhập mã PIN để xóa bản ghi:" 
                  : "Nhập mã PIN để chỉnh sửa thông tin này:"
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                type="password"
                placeholder="Nhập mã PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePinConfirm();
                  }
                }}
                className="text-center text-lg tracking-widest"
                maxLength={4}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handlePinCancel}>
                Hủy bỏ
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePinConfirm}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
