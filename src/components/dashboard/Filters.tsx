"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Filter, AlertTriangle, RotateCcw, Search } from "lucide-react";
import type { FilterState } from "@/lib/transform";
import { useDebounce } from "@/hooks/useDebounce";

interface FilterOptions {
  branches: string[];
  consignees: string[];
  dateRange: { min: string; max: string };
}

interface FiltersProps {
  filters: FilterState;
  options: FilterOptions;
  onChange: (key: keyof FilterState, value: string | boolean | number | null) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
}

const DEBOUNCE_MS = 300;

export function Filters({
  filters,
  options,
  onChange,
  onReset,
  totalCount,
  filteredCount,
  hasActiveFilters,
}: FiltersProps) {
  // Local state for consignee search input (for debouncing)
  const [consigneeSearch, setConsigneeSearch] = useState(filters.consignee);
  const debouncedConsigneeSearch = useDebounce(consigneeSearch, DEBOUNCE_MS);

  // Sync debounced value to filter state
  useEffect(() => {
    if (debouncedConsigneeSearch !== filters.consignee) {
      onChange("consignee", debouncedConsigneeSearch);
    }
  }, [debouncedConsigneeSearch, filters.consignee, onChange]);

  // Keep local state in sync with external filter changes (e.g., reset)
  useEffect(() => {
    if (filters.consignee !== consigneeSearch && filters.consignee === "") {
      setConsigneeSearch("");
    }
  }, [filters.consignee, consigneeSearch]);

  // Filter consignees based on search input
  const filteredConsignees = useMemo(() => {
    if (!consigneeSearch) return options.consignees;
    const searchLower = consigneeSearch.toLowerCase();
    return options.consignees.filter((c) =>
      c.toLowerCase().includes(searchLower)
    );
  }, [options.consignees, consigneeSearch]);

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

        {/* Consignee Search */}
        <div className="flex-1 min-w-[180px] max-w-[260px]">
          <label className="block text-xs font-medium text-ft-gray-500 mb-1">
            Nearest Consignee
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ft-gray-400" />
            <input
              type="text"
              value={consigneeSearch}
              onChange={(e) => setConsigneeSearch(e.target.value)}
              placeholder="Search consignees..."
              list="consignee-options"
              className="w-full h-10 pl-9 pr-3 bg-ft-gray-50 border border-ft-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
            />
            <datalist id="consignee-options">
              {filteredConsignees.slice(0, 20).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {consigneeSearch && (
              <button
                onClick={() => {
                  setConsigneeSearch("");
                  onChange("consignee", "");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ft-gray-400 hover:text-ft-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <div className="flex-shrink-0">
            <button
              onClick={onReset}
              className="h-10 flex items-center gap-2 px-4 bg-ft-gray-100 hover:bg-ft-gray-200 text-ft-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
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
