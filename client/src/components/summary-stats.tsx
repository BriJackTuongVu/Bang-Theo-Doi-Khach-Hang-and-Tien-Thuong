import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, FileText, Percent, DollarSign, Calendar, ChevronDown, ChevronUp, Check, X, RefreshCw, UserCheck, TrendingUp, Clock, CalendarDays } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage, groupRecordsByMonth } from "@/lib/utils";
import { TrackingRecord, CustomerReport, calculateBonus } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("total");
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const queryClient = useQueryClient();
  
  // Enable auto-sync
  useAutoSync();
  
  const monthlyData = groupRecordsByMonth(records);

  // Function to group records by week
  const groupRecordsByWeek = (records: TrackingRecord[]) => {
    const weeks: { [key: string]: TrackingRecord[] } = {};
    
    records.forEach(record => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(record);
    });

    return Object.entries(weeks)
      .map(([weekKey, weekRecords]) => ({
        weekKey,
        weekName: formatWeekName(weekKey),
        records: weekRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }))
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  };

  // Function to group records by year
  const groupRecordsByYear = (records: TrackingRecord[]) => {
    const years: { [key: string]: TrackingRecord[] } = {};
    
    records.forEach(record => {
      const year = new Date(record.date).getFullYear().toString();
      if (!years[year]) {
        years[year] = [];
      }
      years[year].push(record);
    });

    return Object.entries(years)
      .map(([year, yearRecords]) => ({
        year,
        yearName: `Năm ${year}`,
        records: yearRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }))
      .sort((a, b) => b.year.localeCompare(a.year));
  };

  // Helper functions
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const formatWeekName = (weekKey: string) => {
    const [year, week] = weekKey.split('-W');
    return `Tuần ${week}, ${year}`;
  };

  const weeklyData = groupRecordsByWeek(records);
  const yearlyData = groupRecordsByYear(records);

  // Compact stats box component
  const StatsSummaryBox = ({ data, title, icon, showButton = false, buttonLabel = "", onButtonClick }: { 
    data: { totalScheduled: number; totalReported: number; totalClosed: number; totalBonus: number }, 
    title: string,
    icon: React.ReactNode,
    showButton?: boolean,
    buttonLabel?: string,
    onButtonClick?: () => void
  }) => {
    const reportRate = data.totalScheduled > 0 ? (data.totalReported / data.totalScheduled) * 100 : 0;
    const closureRate = data.totalReported > 0 ? (data.totalClosed / data.totalReported) * 100 : 0;

    return (
      <div className="bg-white border border-gray-200 rounded p-1 shadow-sm">
        <div className="grid grid-cols-8 gap-0.5 items-center">
          {/* Tiêu đề - cột đầu tiên */}
          <div className="flex items-center min-w-[80px]">
            <div className="h-2 w-2 mr-1">{icon}</div>
            <h4 className="text-xs font-medium text-gray-700 whitespace-nowrap">{title}</h4>
          </div>
          
          {/* Hẹn */}
          <div className="bg-blue-50 rounded px-0.5 py-0.5 text-center">
            <div className="text-xs font-bold text-blue-800">{formatNumber(data.totalScheduled)}</div>
          </div>

          {/* Report */}
          <div className="bg-green-50 rounded px-0.5 py-0.5 text-center">
            <div className="text-xs font-bold text-green-800">{formatNumber(data.totalReported)}</div>
          </div>

          {/* Chốt */}
          <div className="bg-orange-50 rounded px-0.5 py-0.5 text-center">
            <div className="text-xs font-bold text-orange-800">{formatNumber(data.totalClosed)}</div>
          </div>

          {/* %Report */}
          <div className="bg-yellow-50 rounded px-0.5 py-0.5 text-center">
            <div className="text-xs font-bold text-yellow-800">{formatPercentage(reportRate)}</div>
          </div>

          {/* %Chốt */}
          <div className="bg-pink-50 rounded px-0.5 py-0.5 text-center">
            <div className="text-xs font-bold text-pink-800">{formatPercentage(closureRate)}</div>
          </div>

          {/* Thưởng */}
          <div className="bg-purple-50 rounded px-0.5 py-0.5 text-center">
            <div className="text-xs font-bold text-purple-800">{formatCurrency(data.totalBonus)}</div>
          </div>

          {/* Nút Xem thêm */}
          <div className="text-center">
            {showButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onButtonClick}
                className="text-xs h-5 px-1"
              >
                {buttonLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
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
    <div className="space-y-1">
      {/* Header duy nhất */}
      <div className="bg-gray-50 border border-gray-200 rounded p-1 shadow-sm">
        <div className="grid grid-cols-8 gap-0.5 items-center text-center">
          <div></div>
          <div className="text-xs font-medium text-blue-700">Hẹn</div>
          <div className="text-xs font-medium text-green-700">Report</div>
          <div className="text-xs font-medium text-orange-700">Chốt</div>
          <div className="text-xs font-medium text-yellow-700">%Report</div>
          <div className="text-xs font-medium text-pink-700">%Chốt</div>
          <div className="text-xs font-medium text-purple-700">Thưởng</div>
          <div></div>
        </div>
      </div>

      {/* Tổng Kết Chung */}
      <StatsSummaryBox 
        data={overallTotals}
        title="Tổng Kết Chung"
        icon={<TrendingUp className="mr-1 h-3 w-3" />}
      />

      {/* Thống Kê Theo Tuần */}
      {weeklyData.length > 0 && (
        <div className="space-y-1">
          {(showAllWeeks ? weeklyData : weeklyData.slice(0, 1)).map((week, index) => {
            const weekStats = calculateMonthStats(week.records);
            const isFirst = index === 0;
            const showButton = isFirst && weeklyData.length > 1;
            return (
              <StatsSummaryBox 
                key={week.weekKey}
                data={weekStats}
                title={week.weekName}
                icon={<Clock className="mr-1 h-3 w-3" />}
                showButton={showButton}
                buttonLabel={showAllWeeks ? `Ẩn (${weeklyData.length - 1})` : `+${weeklyData.length - 1}`}
                onButtonClick={() => setShowAllWeeks(!showAllWeeks)}
              />
            );
          })}
        </div>
      )}

      {/* Thống Kê Theo Tháng - Hiển thị 1 tháng với dropdown */}
      {monthlyData.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Tháng
            </h3>
            {monthlyData.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllMonths(!showAllMonths)}
                className="text-xs h-6 px-2"
              >
                {showAllMonths ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ẩn bớt
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Xem thêm ({monthlyData.length - 1})
                  </>
                )}
              </Button>
            )}
          </div>
          {(showAllMonths ? monthlyData : monthlyData.slice(0, 1)).map((month) => {
            const monthStats = calculateMonthStats(month.records);
            return (
              <StatsSummaryBox 
                key={month.monthKey}
                data={monthStats}
                title={month.monthName}
                icon={<Calendar className="mr-2 h-4 w-4" />}
              />
            );
          })}
        </div>
      )}

      {/* Thống Kê Theo Năm */}
      {yearlyData.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center px-1">
            <CalendarDays className="mr-1 h-4 w-4" />
            Năm
          </h3>
          {yearlyData.map((year) => {
            const yearStats = calculateMonthStats(year.records);
            return (
              <StatsSummaryBox 
                key={year.year}
                data={yearStats}
                title={year.yearName}
                icon={<CalendarDays className="mr-2 h-4 w-4" />}
              />
            );
          })}
        </div>
      )}


    </div>
  );
}
