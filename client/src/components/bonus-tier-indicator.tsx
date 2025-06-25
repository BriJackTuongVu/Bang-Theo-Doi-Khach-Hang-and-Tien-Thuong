import { Card, CardContent } from "@/components/ui/card";
import { BONUS_TIERS } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Trophy, Star, Award, Gem } from "lucide-react";

const iconMap = {
  star: Star,
  award: Award,
  gem: Gem,
};

export function BonusTierIndicator() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Trophy className="text-yellow-500 mr-2 h-5 w-5" />
          Thang Điểm Tiền Thưởng
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(BONUS_TIERS).map(([key, tier]) => {
            const Icon = iconMap[tier.icon as keyof typeof iconMap];
            const colorClasses = {
              yellow: "border-yellow-400 text-yellow-400",
              orange: "border-orange-400 text-orange-400",
              green: "border-green-400 text-green-400",
            };
            
            return (
              <div key={key} className={`bg-white rounded-lg p-4 border-l-4 ${colorClasses[tier.color].replace('text-', 'border-')}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`h-5 w-5 ${colorClasses[tier.color]}`} />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {tier.threshold}%+ Khách Hàng
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(tier.rate)}/report
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
