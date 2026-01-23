"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import type { DiversionRow } from "@/lib/schema";
import {
  buildDashboardModel,
  DEFAULT_FILTERS,
  formatDateTime,
  type FilterState,
  type DashboardModel,
} from "@/lib/transform";
import { Header } from "@/components/dashboard/Header";
import { Filters } from "@/components/dashboard/Filters";
import { Scorecards } from "@/components/dashboard/Scorecards";
import { Charts } from "@/components/dashboard/Charts";
import { DataTable } from "@/components/dashboard/DataTable";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function DashboardPage() {
  const [allData, setAllData] = useState<DiversionRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build dashboard model from data and filters
  const model: DashboardModel | null = useMemo(() => {
    if (allData.length === 0 && !isLoading) return null;
    if (allData.length === 0) return null;
    return buildDashboardModel(allData, filters);
  }, [allData, filters, isLoading]);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sheets");
      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setAllData(result.data);
      setLastUpdated(result.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFilterChange = (key: keyof FilterState, value: string | boolean | number | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header
          lastUpdated={null}
          isRefreshing={false}
          onRefresh={() => {}}
        />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchData(true)}
        />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-ft-error/10 border border-ft-error/20 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-ft-error mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-ft-gray-900 mb-2">
              Failed to load data
            </h2>
            <p className="text-ft-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark text-ft-black font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchData(true)}
        />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg border border-ft-gray-200 p-12 text-center">
            <p className="text-ft-gray-500">No data available</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ft-gray-50">
      <Header
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchData(true)}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <Filters
          filters={filters}
          options={model.filterOptions}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          totalCount={model.totalRows}
          filteredCount={model.filteredRows.length}
        />

        {/* Scorecards */}
        <Scorecards scorecards={model.scorecards} />

        {/* Charts */}
        <Charts
          branchChart={model.branchChart}
          consigneeChart={model.consigneeChart}
        />

        {/* Data Table */}
        <DataTable data={model.filteredRows} />
      </main>
    </div>
  );
}
