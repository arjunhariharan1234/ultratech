import { X, Filter } from "lucide-react";
import type { FilterState } from "@/lib/schema";

interface FilterOptions {
  branches: string[];
  loadStatuses: string[];
  vehicleTypes: string[];
  freightRemarks: string[];
}

interface FiltersProps {
  filters: FilterState;
  options: FilterOptions;
  onChange: (key: keyof FilterState, value: string) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

export function Filters({
  filters,
  options,
  onChange,
  onClear,
  totalCount,
  filteredCount,
}: FiltersProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Branch */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Branch
          </label>
          <select
            value={filters.branch}
            onChange={(e) => onChange("branch", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          >
            <option value="">All Branches</option>
            {options.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Load Status */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Load Status
          </label>
          <select
            value={filters.loadStatus}
            onChange={(e) => onChange("loadStatus", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {options.loadStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Type */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Vehicle Type
          </label>
          <select
            value={filters.vehicleType}
            onChange={(e) => onChange("vehicleType", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          >
            <option value="">All Types</option>
            {options.vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Freight Remarks */}
        <div className="flex-1 min-w-[200px] max-w-[280px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Freight Remarks
          </label>
          <select
            value={filters.freightRemarks}
            onChange={(e) => onChange("freightRemarks", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          >
            <option value="">All Remarks</option>
            {options.freightRemarks.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="flex-1 min-w-[140px] max-w-[160px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange("dateFrom", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          />
        </div>

        {/* Date To */}
        <div className="flex-1 min-w-[140px] max-w-[160px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange("dateTo", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex-shrink-0 pt-5">
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-sm text-ft-gray-500 hover:text-ft-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Result Count */}
      <div className="mt-3 pt-3 border-t border-ft-gray-100 flex items-center gap-2 text-sm text-ft-gray-500">
        <Filter className="w-4 h-4" />
        <span>
          Showing <strong className="text-ft-gray-900">{filteredCount.toLocaleString()}</strong>
          {filteredCount !== totalCount && (
            <> of {totalCount.toLocaleString()}</>
          )} loads
        </span>
      </div>
    </div>
  );
}
