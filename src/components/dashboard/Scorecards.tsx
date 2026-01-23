import {
  IndianRupee,
  Route,
  AlertTriangle,
  MapPin,
  Building2,
  Users,
} from "lucide-react";
import type { Scorecards as ScorecardsType } from "@/lib/transform";
import { formatNumber, formatCurrency, formatDistance } from "@/lib/transform";

interface ScorecardsProps {
  scorecards: ScorecardsType;
}

interface ScorecardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function Scorecard({
  title,
  value,
  subtitle,
  icon,
  highlight,
}: ScorecardProps) {
  return (
    <div
      className={`bg-white rounded-lg border p-5 transition-colors ${
        highlight
          ? "border-ft-yellow bg-ft-yellow/5"
          : "border-ft-gray-200 hover:border-ft-gray-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-ft-gray-500">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${highlight ? "text-ft-yellow-dark" : "text-ft-gray-900"}`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-ft-gray-400">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            highlight ? "bg-ft-yellow/20" : "bg-ft-yellow/10"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Scorecards({ scorecards }: ScorecardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Scorecard
        title="Total Potential Recovery"
        value={formatCurrency(scorecards.totalPotentialRecovery)}
        subtitle="Sum of freight impact"
        icon={<IndianRupee className="w-5 h-5 text-ft-yellow" />}
        highlight
      />

      <Scorecard
        title="Avg Short Lead Distance"
        value={formatDistance(scorecards.avgShortLeadDistance)}
        subtitle="Across diverted loads"
        icon={<Route className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Max Diverted Distance"
        value={formatDistance(scorecards.maxDivertedDistance)}
        subtitle="Largest deviation"
        icon={<AlertTriangle className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Diverted Journeys"
        value={formatNumber(scorecards.totalDivertedJourneys)}
        subtitle="Unique journey IDs"
        icon={<MapPin className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Consignees Involved"
        value={formatNumber(scorecards.totalConsigneesInvolved)}
        subtitle="Distinct consignees"
        icon={<Users className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Branches Affected"
        value={formatNumber(scorecards.totalBranchesWithDiversions)}
        subtitle="With diversions"
        icon={<Building2 className="w-5 h-5 text-ft-yellow" />}
      />
    </div>
  );
}
