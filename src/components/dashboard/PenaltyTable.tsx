"use client";

import { AlertTriangle } from "lucide-react";
import type { PenaltyCandidateRow } from "@/lib/transform";
import { formatCurrency, formatDistance, formatDate } from "@/lib/transform";

interface PenaltyTableProps {
  data: PenaltyCandidateRow[];
}

export function PenaltyTable({ data }: PenaltyTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-ft-yellow" />
          <h3 className="text-sm font-semibold text-ft-gray-900">Penalty Candidates</h3>
        </div>
        <p className="text-ft-gray-400 text-center py-8">No penalty candidates found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200">
      <div className="px-6 py-4 border-b border-ft-gray-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-ft-yellow" />
          <h3 className="text-sm font-semibold text-ft-gray-900">Penalty Candidates</h3>
        </div>
        <p className="text-xs text-ft-gray-500 mt-1">
          Top diversions by recovery amount - sorted highest to lowest
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-ft-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Journey ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Branch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Consignee
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Short Lead
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ft-gray-600 uppercase">
                Recovery
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase">
                Route
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ft-gray-100">
            {data.map((row, index) => (
              <tr key={`${row.journeyId}-${index}`} className="hover:bg-ft-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-ft-gray-900">
                  {row.journeyId || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700">
                  {formatDate(row.date)}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700">
                  {row.branchName || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700 max-w-[150px] truncate" title={row.consignee}>
                  {row.consignee || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-ft-gray-700 text-right">
                  {formatDistance(row.shortLeadDistance)}
                </td>
                <td className="px-4 py-3 text-sm text-ft-yellow-dark font-semibold text-right">
                  {formatCurrency(row.recoveryAmount)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-ft-gray-900 max-w-[180px] truncate" title={row.originLocation}>
                    {row.originLocation || "—"}
                  </div>
                  <div className="text-xs text-ft-gray-500 flex items-center gap-1 max-w-[180px]">
                    <span>→</span>
                    <span className="truncate" title={row.stopLocation}>{row.stopLocation || "—"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
