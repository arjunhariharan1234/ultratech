"use client";

import { Route } from "lucide-react";
import type { CorridorTableRow } from "@/lib/transform";
import { formatCurrency, formatNumber, formatDistance } from "@/lib/transform";

interface CorridorTableProps {
  data: CorridorTableRow[];
}

export function CorridorTable({ data }: CorridorTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-5 h-5 text-ft-yellow" />
          <h3 className="text-sm font-semibold text-ft-gray-900">Corridor Analysis</h3>
        </div>
        <p className="text-ft-gray-400 text-center py-8">No corridor data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200">
      <div className="px-6 py-4 border-b border-ft-gray-200">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-ft-yellow" />
          <h3 className="text-sm font-semibold text-ft-gray-900">Corridor Analysis</h3>
        </div>
        <p className="text-xs text-ft-gray-500 mt-1">
          Top corridors with most diversions (Origin → Destination)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-ft-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Corridor
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Diversions
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Recovery
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Avg Lead
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ft-gray-100">
            {data.slice(0, 15).map((row) => (
              <tr key={row.corridor} className="hover:bg-ft-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-ft-gray-900">
                    {row.origin}
                  </div>
                  <div className="text-xs text-ft-gray-500 flex items-center gap-1">
                    <span>→</span>
                    <span>{row.destination}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700 text-right">
                  {formatNumber(row.count)}
                </td>
                <td className="px-4 py-3 text-sm text-ft-yellow-dark font-medium text-right">
                  {formatCurrency(row.totalRecovery)}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700 text-right">
                  {formatDistance(row.avgShortLead)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
