import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Percent, DollarSign } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { TrackingRecord, calculateBonus } from "@shared/schema";

interface SummaryStatsProps {
  records: TrackingRecord[];
}

export function SummaryStats({ records }: SummaryStatsProps) {
  const totals = records.reduce(
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

  const averagePercentage = totals.totalScheduled > 0 
    ? (totals.totalReported / totals.totalScheduled) * 100 
    : 0;

  const stats = [
    {
      icon: Users,
      label: "Tổng Khách Hẹn",
      value: formatNumber(totals.totalScheduled),
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      icon: FileText,
      label: "Tổng Report",
      value: formatNumber(totals.totalReported),
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
    },
    {
      icon: Percent,
      label: "Tỉ Lệ TB",
      value: formatPercentage(averagePercentage),
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
      valueColor: "text-yellow-600",
    },
    {
      icon: DollarSign,
      label: "Tổng Thưởng",
      value: formatCurrency(totals.totalBonus),
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      valueColor: "text-purple-600",
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng Kết</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.bgColor} rounded-lg p-4`}>
              <div className="flex items-center">
                <stat.icon className={`${stat.iconColor} text-xl mr-3 h-6 w-6`} />
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.valueColor}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
