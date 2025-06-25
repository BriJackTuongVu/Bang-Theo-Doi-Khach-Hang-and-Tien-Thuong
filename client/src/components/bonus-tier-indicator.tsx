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
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
        <Trophy className="text-yellow-500 mr-2 h-4 w-4" />
        Thang Điểm Tiền Thưởng
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(BONUS_TIERS).map(([key, tier]) => {
          const Icon = iconMap[tier.icon as keyof typeof iconMap];
          const colorClasses = {
            yellow: "border-yellow-400 text-yellow-600",
            orange: "border-orange-400 text-orange-600",
            green: "border-green-400 text-green-600",
          };
          
          return (
            <div key={key} className={`bg-white rounded p-2 border-l-2 ${colorClasses[tier.color].replace('text-', 'border-')}`}>
              <div className="flex items-center">
                <Icon className={`h-3 w-3 ${colorClasses[tier.color]} mr-1`} />
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {tier.threshold}%+
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatCurrency(tier.rate)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
