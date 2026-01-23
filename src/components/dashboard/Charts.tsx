"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint } from "@/lib/transform";
import { formatCurrency, formatNumber } from "@/lib/transform";

interface ChartsProps {
  branchChart: ChartDataPoint[];
  consigneeChart: ChartDataPoint[];
}

type ChartMetric = "recovery" | "count";

export function Charts({ branchChart, consigneeChart }: ChartsProps) {
  const [branchMetric, setBranchMetric] = useState<ChartMetric>("recovery");
  const [consigneeMetric, setConsigneeMetric] = useState<ChartMetric>("recovery");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Branch Chart */}
      <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ft-gray-900">
            Diversions by Branch
          </h3>
          <div className="flex gap-1 bg-ft-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBranchMetric("recovery")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                branchMetric === "recovery"
                  ? "bg-white text-ft-gray-900 shadow-sm"
                  : "text-ft-gray-500 hover:text-ft-gray-700"
              }`}
            >
              Recovery
            </button>
            <button
              onClick={() => setBranchMetric("count")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                branchMetric === "count"
                  ? "bg-white text-ft-gray-900 shadow-sm"
                  : "text-ft-gray-500 hover:text-ft-gray-700"
              }`}
            >
              Count
            </button>
          </div>
        </div>
        <div className="h-64">
          {branchChart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-ft-gray-400">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [
                    branchMetric === "recovery"
                      ? formatCurrency(value as number)
                      : formatNumber(value as number),
                    branchMetric === "recovery" ? "Recovery" : "Count",
                  ]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey={branchMetric}
                  fill="#ffbe07"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Consignee Chart */}
      <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ft-gray-900">
            Diversions by Consignee
          </h3>
          <div className="flex gap-1 bg-ft-gray-100 rounded-lg p-1">
            <button
              onClick={() => setConsigneeMetric("recovery")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                consigneeMetric === "recovery"
                  ? "bg-white text-ft-gray-900 shadow-sm"
                  : "text-ft-gray-500 hover:text-ft-gray-700"
              }`}
            >
              Recovery
            </button>
            <button
              onClick={() => setConsigneeMetric("count")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                consigneeMetric === "count"
                  ? "bg-white text-ft-gray-900 shadow-sm"
                  : "text-ft-gray-500 hover:text-ft-gray-700"
              }`}
            >
              Count
            </button>
          </div>
        </div>
        <div className="h-64">
          {consigneeChart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-ft-gray-400">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consigneeChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value) => [
                    consigneeMetric === "recovery"
                      ? formatCurrency(value as number)
                      : formatNumber(value as number),
                    consigneeMetric === "recovery" ? "Recovery" : "Count",
                  ]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey={consigneeMetric}
                  fill="#0a0a0a"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
