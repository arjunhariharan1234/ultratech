"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { DashboardMetrics } from "@/lib/schema";
import { getTopItems, formatCurrency, formatNumber, formatDate } from "@/lib/transform";

interface ChartsProps {
  metrics: DashboardMetrics;
}

const COLORS = ["#ffbe07", "#0a0a0a", "#737373", "#a3a3a3", "#d4d4d4", "#22c55e"];

export function Charts({ metrics }: ChartsProps) {
  const branchData = getTopItems(metrics.loadsByBranch, 6);
  const freightByBranchData = getTopItems(metrics.freightImpactByBranch, 6, false);
  const statusData = Object.entries(metrics.loadsByStatus).map(([name, value]) => ({
    name,
    value,
  }));
  const remarksData = getTopItems(metrics.freightImpactByRemarks, 5, false);

  const trendData = metrics.dailyTrends.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  return (
    <div className="space-y-6">
      {/* Row 1: Branch Distribution + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loads by Branch */}
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <h3 className="text-sm font-semibold text-ft-gray-900 mb-4">
            Loads by Branch
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [formatNumber(value as number), "Loads"]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#ffbe07" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Load Status Distribution */}
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <h3 className="text-sm font-semibold text-ft-gray-900 mb-4">
            Load Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: "#a3a3a3", strokeWidth: 1 }}
                >
                  {statusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatNumber(value as number), "Loads"]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Freight Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Freight Impact by Branch */}
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <h3 className="text-sm font-semibold text-ft-gray-900 mb-4">
            Freight Impact by Branch
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freightByBranchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value as number), "Impact"]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#0a0a0a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Freight Impact by Remarks */}
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <h3 className="text-sm font-semibold text-ft-gray-900 mb-4">
            Freight Impact by Calculation Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={remarksData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={180}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value as number), "Impact"]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#737373" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Daily Trends */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <h3 className="text-sm font-semibold text-ft-gray-900 mb-4">
            Daily Trends
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  orientation="left"
                />
                <YAxis
                  yAxisId="right"
                  tick={{ fontSize: 12 }}
                  orientation="right"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [
                    name === "loads" ? formatNumber(value as number) : formatCurrency(value as number),
                    name === "loads" ? "Loads" : "Freight Impact",
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="loads"
                  stroke="#ffbe07"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Loads"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="freightImpact"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Freight Impact"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
