"use client";

import { Users } from "lucide-react";
import type { ConsigneeTableRow } from "@/lib/transform";
import { formatCurrency, formatNumber } from "@/lib/transform";

interface ConsigneeTableProps {
  data: ConsigneeTableRow[];
}

export function ConsigneeTable({ data }: ConsigneeTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-ft-yellow" />
          <h3 className="text-sm font-semibold text-ft-gray-900">Consignee Analysis</h3>
        </div>
        <p className="text-ft-gray-400 text-center py-8">No consignee data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200">
      <div className="px-6 py-4 border-b border-ft-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-ft-yellow" />
          <h3 className="text-sm font-semibold text-ft-gray-900">Consignee Analysis</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-ft-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Consignee
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Journeys
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Recovery
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Repeat %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ft-gray-100">
            {data.slice(0, 10).map((row) => (
              <tr key={row.consignee} className="hover:bg-ft-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-ft-gray-900">
                  {row.consignee}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700 text-right">
                  {formatNumber(row.divertedJourneys)}
                </td>
                <td className="px-4 py-3 text-sm text-ft-yellow-dark font-medium text-right">
                  {formatCurrency(row.totalRecovery)}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700 text-right">
                  {formatNumber(row.repeatRate, 1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
