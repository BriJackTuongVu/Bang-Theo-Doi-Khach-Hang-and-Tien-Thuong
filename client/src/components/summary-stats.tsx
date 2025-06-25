import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Percent, DollarSign, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage, groupRecordsByWeek } from "@/lib/utils";
import { TrackingRecord, calculateBonus } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SummaryStatsProps {
  records: TrackingRecord[];
}

export function SummaryStats({ records }: SummaryStatsProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  
  const weeklyData = groupRecordsByWeek(records);
  
  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };

  const calculateWeekStats = (weekRecords: TrackingRecord[]) => {
    return weekRecords.reduce(
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

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng Kết Theo Tuần (Thứ 2 - Thứ 6)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {weeklyData.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có dữ liệu theo tuần</p>
          ) : (
            weeklyData.map((week) => {
              const weekStats = calculateWeekStats(week.records);
              const weekPercentage = weekStats.totalScheduled > 0 
                ? (weekStats.totalReported / weekStats.totalScheduled) * 100 
                : 0;
              const isExpanded = expandedWeeks.has(week.weekKey);

              return (
                <Collapsible key={week.weekKey}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-gray-50"
                      onClick={() => toggleWeek(week.weekKey)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-left">
                          <p className="font-medium">Tuần {week.weekRange}</p>
                          <p className="text-sm text-gray-500">{week.records.length} ngày làm việc</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">
                            {formatNumber(weekStats.totalScheduled)} khách hẹn
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            {formatNumber(weekStats.totalReported)} reports
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-600">
                            {formatPercentage(weekPercentage)}
                          </p>
                          <p className="text-sm font-medium text-purple-600">
                            {formatCurrency(weekStats.totalBonus)}
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
                                {formatNumber(weekStats.totalScheduled)}
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
                                {formatNumber(weekStats.totalReported)}
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
                                {formatPercentage(weekPercentage)}
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
                                {formatCurrency(weekStats.totalBonus)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Daily breakdown */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Chi tiết theo ngày:</h4>
                        <div className="space-y-1">
                          {week.records.map((record) => {
                            const dailyBonus = calculateBonus(record.scheduledCustomers, record.reportedCustomers);
                            const dayName = new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'long' });
                            
                            return (
                              <div key={record.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
                                <span className="font-medium">
                                  {dayName} ({new Date(record.date).toLocaleDateString('vi-VN')})
                                </span>
                                <div className="flex space-x-4 text-xs">
                                  <span className="text-blue-600">{record.scheduledCustomers} hẹn</span>
                                  <span className="text-green-600">{record.reportedCustomers} reports</span>
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
