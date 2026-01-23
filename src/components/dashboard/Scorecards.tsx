import {
  Package,
  TrendingDown,
  Clock,
  Route,
  Truck,
  Timer,
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/schema";
import { formatNumber, formatCurrency } from "@/lib/transform";

interface ScorecardsProps {
  metrics: DashboardMetrics;
}

interface ScorecardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "positive" | "negative" | "neutral";
  trendValue?: string;
}

function Scorecard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
}: ScorecardProps) {
  const trendColors = {
    positive: "text-ft-success bg-ft-success/10",
    negative: "text-ft-error bg-ft-error/10",
    neutral: "text-ft-gray-500 bg-ft-gray-100",
  };

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200 p-5 hover:border-ft-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-ft-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ft-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-ft-gray-400">{subtitle}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-ft-yellow/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-3 pt-3 border-t border-ft-gray-100">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${trendColors[trend]}`}
          >
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}

export function Scorecards({ metrics }: ScorecardsProps) {
  const freightImpactTrend: "positive" | "negative" | "neutral" =
    metrics.totalFreightImpact < 0
      ? "negative"
      : metrics.totalFreightImpact > 0
        ? "positive"
        : "neutral";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Scorecard
        title="Total Loads"
        value={formatNumber(metrics.totalLoads)}
        subtitle="Shipments tracked"
        icon={<Package className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Freight Impact"
        value={formatCurrency(metrics.totalFreightImpact)}
        subtitle="Net savings/loss"
        icon={<TrendingDown className="w-5 h-5 text-ft-yellow" />}
        trend={freightImpactTrend}
        trendValue={
          metrics.totalFreightImpact < 0
            ? "Savings opportunity"
            : metrics.totalFreightImpact > 0
              ? "Additional cost"
              : "No impact"
        }
      />

      <Scorecard
        title="Avg Transit Time"
        value={`${formatNumber(metrics.avgTransitTime, 1)} days`}
        subtitle="Origin to delivery"
        icon={<Clock className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Total Distance"
        value={`${formatNumber(metrics.totalDistance)} km`}
        subtitle="Cumulative travel"
        icon={<Route className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Avg Loading TAT"
        value={`${formatNumber(metrics.avgLoadingTat, 1)} hrs`}
        subtitle="At origin depot"
        icon={<Timer className="w-5 h-5 text-ft-yellow" />}
      />

      <Scorecard
        title="Tracked Loads"
        value={formatNumber(metrics.trackedLoads)}
        subtitle={`${formatNumber((metrics.trackedLoads / metrics.totalLoads) * 100, 0)}% tracking rate`}
        icon={<Truck className="w-5 h-5 text-ft-yellow" />}
      />
    </div>
  );
}
