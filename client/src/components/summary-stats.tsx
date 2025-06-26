import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, FileText, Percent, DollarSign, Calendar, ChevronDown, ChevronUp, Check, X, RefreshCw, UserCheck } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage, groupRecordsByMonth } from "@/lib/utils";
import { TrackingRecord, CustomerReport, calculateBonus } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface SummaryStatsProps {
  records: TrackingRecord[];
}

// Editable Cell Component
interface EditableCellProps {
  value: number;
  recordId: number;
  field: 'scheduledCustomers' | 'reportedCustomers' | 'closedCustomers';
  onUpdate: (id: number, field: string, value: number) => void;
}

// Extend window to include autoSaveTimeout
declare global {
  interface Window {
    autoSaveTimeout: number;
  }
}

function EditableCell({ value, recordId, field, onUpdate }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  useEffect(() => {
    // Cleanup timeout when component unmounts
    return () => {
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
      }
    };
  }, []);

  const handleSave = () => {
    const newValue = parseInt(editValue) || 0;
    if (newValue !== value) {
      onUpdate(recordId, field, newValue);
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
        onChange={(e) => {
          setEditValue(e.target.value);
          // Auto-save on every change with a small delay
          const newValue = parseInt(e.target.value) || 0;
          if (newValue !== value) {
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(() => {
              onUpdate(recordId, field, newValue);
              setIsEditing(false);
            }, 500); // 500ms delay
          }
        }}
        onBlur={() => {
          clearTimeout(window.autoSaveTimeout);
          handleSave();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(window.autoSaveTimeout);
            handleSave();
          }
          if (e.key === 'Escape') {
            clearTimeout(window.autoSaveTimeout);
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
      title="Click để chỉnh sửa - tự động lưu khi nhập"
    >
      {value}
    </div>
  );
}

// Auto-sync hook with debounce to prevent infinite loops
function useAutoSync() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      console.log('Frontend: Starting auto-sync...');
      const response = await fetch('/api/sync-tracking-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      const result = await response.json();
      console.log('Frontend: Auto-sync result:', result);
      return result;
    },
    onSuccess: (data) => {
      if (data.updatedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/tracking-records'] });
        queryClient.refetchQueries({ queryKey: ['/api/tracking-records'] });
      }
    },
    onError: (error) => {
      console.error('Frontend: Auto-sync error:', error);
    }
  });

  // Auto-sync every 15 seconds (reduced from 5 for better performance)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!syncMutation.isPending) {
        syncMutation.mutate();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [syncMutation]);

  return syncMutation;
}

export function SummaryStats({ records }: SummaryStatsProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  
  // Enable auto-sync
  useAutoSync();
  
  const monthlyData = groupRecordsByMonth(records);
  
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; field: string; value: number }) => {
      const updateData = { [data.field]: data.value };
      return await apiRequest(`/api/tracking-records/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-records"] });
      toast({
        title: "Đã cập nhật",
        description: "Dữ liệu đã được lưu thành công!",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể lưu dữ liệu. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const handleCellUpdate = (id: number, field: string, value: number) => {
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
          totalClosed: acc.totalClosed + (record.closedCustomers || 0),
          totalBonus: acc.totalBonus + totalBonus,
        };
      },
      { totalScheduled: 0, totalReported: 0, totalClosed: 0, totalBonus: 0 }
    );
  };

  const overallTotals = records.reduce(
    (acc, record) => {
      const { totalBonus } = calculateBonus(record.scheduledCustomers, record.reportedCustomers);
      return {
        totalScheduled: acc.totalScheduled + record.scheduledCustomers,
        totalReported: acc.totalReported + record.reportedCustomers,
        totalClosed: acc.totalClosed + (record.closedCustomers || 0),
        totalBonus: acc.totalBonus + totalBonus,
      };
    },
    { totalScheduled: 0, totalReported: 0, totalClosed: 0, totalBonus: 0 }
  );

  const overallAveragePercentage = overallTotals.totalScheduled > 0 
    ? (overallTotals.totalReported / overallTotals.totalScheduled) * 100 
    : 0;

  const overallClosureRate = overallTotals.totalReported > 0 
    ? (overallTotals.totalClosed / overallTotals.totalReported) * 100 
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center">
                <Users className="text-blue-600 mr-2 h-5 w-5" />
                <div>
                  <p className="text-xs text-gray-600">Tổng Khách Hẹn</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatNumber(overallTotals.totalScheduled)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center">
                <FileText className="text-green-600 mr-2 h-5 w-5" />
                <div>
                  <p className="text-xs text-gray-600">Tổng Report</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatNumber(overallTotals.totalReported)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center">
                <Users className="text-orange-600 mr-2 h-5 w-5" />
                <div>
                  <p className="text-xs text-gray-600">Tổng Chốt</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatNumber(overallTotals.totalClosed)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center">
                <Percent className="text-yellow-600 mr-2 h-5 w-5" />
                <div>
                  <p className="text-xs text-gray-600">Tỉ Lệ Report</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatPercentage(overallAveragePercentage)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-pink-50 rounded-lg p-3">
              <div className="flex items-center">
                <Percent className="text-pink-600 mr-2 h-5 w-5" />
                <div>
                  <p className="text-xs text-gray-600">Tỉ Lệ Chốt</p>
                  <p className="text-xl font-bold text-pink-600">
                    {formatPercentage(overallClosureRate)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center">
                <DollarSign className="text-purple-600 mr-2 h-5 w-5" />
                <div>
                  <p className="text-xs text-gray-600">Tổng Thưởng</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(overallTotals.totalBonus)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Monthly breakdown within general summary */}
          {monthlyData.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Chi tiết theo tháng:</h4>
              {monthlyData.map((month) => {
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
                        className="w-full justify-between p-3 h-auto hover:bg-gray-50 text-sm"
                        onClick={() => toggleMonth(month.monthKey)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-left">
                            <p className="font-medium text-sm">{month.monthName}</p>
                            <p className="text-xs text-gray-500">{month.records.length} ngày</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Compact stats boxes */}
                          <div className="flex items-center space-x-1">
                            <div className="bg-blue-50 rounded px-2 py-1 flex items-center space-x-1">
                              <Users className="text-blue-600 h-3 w-3" />
                              <span className="text-xs font-semibold text-blue-600">{formatNumber(monthStats.totalScheduled)}</span>
                            </div>
                            <div className="bg-green-50 rounded px-2 py-1 flex items-center space-x-1">
                              <FileText className="text-green-600 h-3 w-3" />
                              <span className="text-xs font-semibold text-green-600">{formatNumber(monthStats.totalReported)}</span>
                            </div>
                            <div className="bg-orange-50 rounded px-2 py-1 flex items-center space-x-1">
                              <UserCheck className="text-orange-600 h-3 w-3" />
                              <span className="text-xs font-semibold text-orange-600">{formatNumber(monthStats.totalClosed)}</span>
                            </div>
                            <div className="bg-yellow-50 rounded px-2 py-1 flex items-center space-x-1">
                              <Percent className="text-yellow-600 h-3 w-3" />
                              <span className="text-xs font-semibold text-yellow-600">{formatPercentage(monthPercentage)}</span>
                            </div>
                            <div className="bg-pink-50 rounded px-2 py-1 flex items-center space-x-1">
                              <Percent className="text-pink-600 h-3 w-3" />
                              <span className="text-xs font-semibold text-pink-600">
                                {formatPercentage(monthStats.totalReported > 0 ? (monthStats.totalClosed / monthStats.totalReported) * 100 : 0)}
                              </span>
                            </div>
                            <div className="bg-purple-50 rounded px-2 py-1 flex items-center space-x-1">
                              <DollarSign className="text-purple-600 h-3 w-3" />
                              <span className="text-xs font-semibold text-purple-600">{formatCurrency(monthStats.totalBonus)}</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs text-gray-600">Tỉ lệ report</p>
                            <p className="text-sm font-bold text-yellow-600">{formatPercentage(monthPercentage)}</p>
                          </div>
                          <div className="bg-pink-50 rounded p-2">
                            <p className="text-xs text-gray-600">Tỉ lệ chốt</p>
                            <p className="text-sm font-bold text-pink-600">
                              {formatPercentage(monthStats.totalReported > 0 ? (monthStats.totalClosed / monthStats.totalReported) * 100 : 0)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-600">Trung bình/ngày</p>
                            <p className="text-sm font-bold text-gray-600">
                              {formatNumber(Math.round(monthStats.totalScheduled / month.records.length))} hẹn
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-xs text-gray-600">Thưởng TB/ngày</p>
                            <p className="text-sm font-bold text-purple-600">
                              {formatCurrency(Math.round(monthStats.totalBonus / month.records.length))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
