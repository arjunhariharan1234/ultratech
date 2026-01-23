import { X, Filter, AlertTriangle } from "lucide-react";
import type { FilterState } from "@/lib/transform";

interface FilterOptions {
  branches: string[];
  consignees: string[];
  dateRange: { min: string; max: string };
}

interface FiltersProps {
  filters: FilterState;
  options: FilterOptions;
  onChange: (key: keyof FilterState, value: string | boolean | number | null) => void;
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
  const hasActiveFilters =
    filters.branch !== "" ||
    filters.consignee !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.minFreightImpact !== null ||
    !filters.onlyDiversions;

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200 p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Only Diversions Toggle */}
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Show
          </label>
          <button
            onClick={() => onChange("onlyDiversions", !filters.onlyDiversions)}
            className={`h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              filters.onlyDiversions
                ? "bg-ft-error/10 text-ft-error border border-ft-error/20"
                : "bg-ft-gray-100 text-ft-gray-600 border border-ft-gray-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {filters.onlyDiversions ? "Diversions Only" : "All Loads"}
          </button>
        </div>

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

        {/* Consignee */}
        <div className="flex-1 min-w-[180px] max-w-[240px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Nearest Consignee
          </label>
          <select
            value={filters.consignee}
            onChange={(e) => onChange("consignee", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          >
            <option value="">All Consignees</option>
            {options.consignees.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Min Freight Impact */}
        <div className="flex-1 min-w-[140px] max-w-[160px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Min Impact (₹)
          </label>
          <input
            type="number"
            value={filters.minFreightImpact ?? ""}
            onChange={(e) =>
              onChange(
                "minFreightImpact",
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
            placeholder="e.g. 500"
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          />
        </div>

        {/* Date From */}
        <div className="flex-1 min-w-[140px] max-w-[160px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            min={options.dateRange.min}
            max={options.dateRange.max}
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
            min={options.dateRange.min}
            max={options.dateRange.max}
            onChange={(e) => onChange("dateTo", e.target.value)}
            className="w-full h-10 px-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex-shrink-0">
            <button
              onClick={onClear}
              className="h-10 flex items-center gap-1 text-sm text-ft-gray-500 hover:text-ft-gray-700 transition-colors"
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
          )} {filters.onlyDiversions ? "diversions" : "loads"}
        </span>
      </div>
    </div>
  );
}
