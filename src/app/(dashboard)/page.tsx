"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, AlertCircle, Clock, Truck } from "lucide-react";
import type { DiversionRow } from "@/lib/schema";
import {
  buildDashboardModel,
  DEFAULT_FILTERS,
  formatDateTime,
  type FilterState,
  type DashboardModel,
} from "@/lib/transform";
import { Filters } from "@/components/dashboard/Filters";
import { Scorecards } from "@/components/dashboard/Scorecards";
import { Charts } from "@/components/dashboard/Charts";
import { DataTable } from "@/components/dashboard/DataTable";
import { BranchTable } from "@/components/dashboard/BranchTable";
import { ConsigneeTable } from "@/components/dashboard/ConsigneeTable";
import { CorridorTable } from "@/components/dashboard/CorridorTable";
import { PenaltyTable } from "@/components/dashboard/PenaltyTable";
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
    if (allData.length === 0) return null;
    return buildDashboardModel(allData, filters);
  }, [allData, filters]);

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

  // Header component
  const Header = () => (
    <header className="bg-ft-black text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ft-yellow rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-ft-black" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              Ultratech Diversion Dashboard
            </h1>
          </div>

          {/* Last Updated + Refresh */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-2 text-ft-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>Updated {formatDateTime(lastUpdated)}</span>
              </div>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark disabled:opacity-50 text-ft-black font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-ft-error/10 border border-ft-error/20 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-ft-error mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-ft-gray-900 mb-2">
              Failed to load data
            </h2>
            <p className="text-ft-gray-600 mb-6">{error}</p>
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark text-ft-black font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Empty state (no data)
  if (!model || model.totalRows === 0) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg border border-ft-gray-200 p-12 text-center">
            <Truck className="w-16 h-16 text-ft-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-ft-gray-900 mb-2">
              No data available
            </h2>
            <p className="text-ft-gray-500">
              The data source appears to be empty. Please check your Google Sheet.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Check if filtered results are empty
  const hasNoResults = model.filteredRows.length === 0;

  return (
    <div className="min-h-screen bg-ft-gray-50">
      <Header />

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-40 bg-ft-gray-50 border-b border-ft-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Filters
            filters={filters}
            options={model.filterOptions}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            totalCount={model.totalRows}
            filteredCount={model.filteredRows.length}
          />
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {hasNoResults ? (
          /* Empty Results State */
          <div className="bg-white rounded-lg border border-ft-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-ft-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-ft-gray-900 mb-2">
              No diversions found
            </h2>
            <p className="text-ft-gray-500 mb-4">
              No records match the selected filters. Try adjusting your criteria.
            </p>
            <button
              onClick={handleClearFilters}
              className="text-ft-yellow-dark hover:text-ft-yellow font-medium"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Row 1: Scorecards */}
            <section>
              <Scorecards scorecards={model.scorecards} />
            </section>

            {/* Row 2: Charts */}
            <section>
              <Charts
                branchChart={model.branchChart}
                consigneeChart={model.consigneeChart}
              />
            </section>

            {/* Row 3: Branch & Consignee Tables */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BranchTable data={model.branchTable} />
              <ConsigneeTable data={model.consigneeTable} />
            </section>

            {/* Row 4: Corridor Analysis */}
            <section>
              <CorridorTable data={model.corridorTable} />
            </section>

            {/* Row 5: Penalty Candidates */}
            <section>
              <PenaltyTable data={model.penaltyCandidates} />
            </section>

            {/* Row 6: Raw Data */}
            <section>
              <DataTable data={model.filteredRows} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
