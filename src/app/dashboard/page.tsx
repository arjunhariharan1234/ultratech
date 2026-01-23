"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, memo } from "react";
import { RefreshCw, AlertCircle, Clock, Truck, Radio } from "lucide-react";
import type { DiversionRow } from "@/lib/schema";
import {
  buildDashboardModel,
  extractFilterOptions,
  formatDateTime,
  type DashboardModel,
  type FilterState,
} from "@/lib/transform";
import { useFilterParams } from "@/hooks/useFilterParams";
import { Filters } from "@/components/dashboard/Filters";
import { Scorecards } from "@/components/dashboard/Scorecards";
import { Charts } from "@/components/dashboard/Charts";
import { DataTable } from "@/components/dashboard/DataTable";
import { BranchTable } from "@/components/dashboard/BranchTable";
import { ConsigneeTable } from "@/components/dashboard/ConsigneeTable";
import { CorridorTable } from "@/components/dashboard/CorridorTable";
import { PenaltyTable } from "@/components/dashboard/PenaltyTable";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PerformanceWarning, LARGE_DATASET_THRESHOLD } from "@/components/ui/PerformanceWarning";

// Configurable auto-refresh interval (in milliseconds)
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Memoized Header component to prevent unnecessary re-renders
interface HeaderProps {
  lastUpdated: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const Header = memo(function Header({ lastUpdated, isRefreshing, onRefresh }: HeaderProps) {
  return (
    <header className="bg-ft-black text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ft-yellow rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-ft-black" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Ultratech Diversion Dashboard
              </h1>
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 text-xs text-ft-gray-400">
                <Radio className="w-3 h-3 text-green-400 animate-pulse" aria-hidden="true" />
                <span>Live from Google Sheet</span>
              </div>
            </div>
          </div>

          {/* Last Updated + Refresh */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-2 text-ft-gray-400 text-sm">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <time dateTime={lastUpdated}>Updated {formatDateTime(lastUpdated)}</time>
              </div>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark disabled:opacity-50 text-ft-black font-medium px-4 py-2 rounded-lg transition-colors"
              aria-label={isRefreshing ? "Refreshing data..." : "Refresh data"}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

// Memoized dashboard sections to prevent unnecessary re-renders
interface DashboardSectionsProps {
  model: DashboardModel;
  resetFilters: () => void;
}

const DashboardSections = memo(function DashboardSections({ model, resetFilters }: DashboardSectionsProps) {
  const hasNoResults = model.filteredRows.length === 0;

  if (hasNoResults) {
    return (
      <div className="bg-white rounded-lg border border-ft-gray-200 p-12 text-center">
        <AlertCircle className="w-12 h-12 text-ft-gray-300 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-ft-gray-900 mb-2">
          No diversions found
        </h2>
        <p className="text-ft-gray-500 mb-4">
          No records match the selected filters. Try adjusting your criteria.
        </p>
        <button
          onClick={resetFilters}
          className="text-ft-yellow-dark hover:text-ft-yellow font-medium"
        >
          Reset all filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Scorecards */}
      <section aria-label="Key metrics">
        <ErrorBoundary>
          <Scorecards scorecards={model.scorecards} />
        </ErrorBoundary>
      </section>

      {/* Row 2: Charts */}
      <section aria-label="Charts">
        <ErrorBoundary>
          <Charts
            branchChart={model.branchChart}
            consigneeChart={model.consigneeChart}
          />
        </ErrorBoundary>
      </section>

      {/* Row 3: Branch & Consignee Tables */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Analysis tables">
        <ErrorBoundary>
          <BranchTable data={model.branchTable} />
        </ErrorBoundary>
        <ErrorBoundary>
          <ConsigneeTable data={model.consigneeTable} />
        </ErrorBoundary>
      </section>

      {/* Row 4: Corridor Analysis */}
      <section aria-label="Corridor analysis">
        <ErrorBoundary>
          <CorridorTable data={model.corridorTable} />
        </ErrorBoundary>
      </section>

      {/* Row 5: Penalty Candidates */}
      <section aria-label="Penalty candidates">
        <ErrorBoundary>
          <PenaltyTable data={model.penaltyCandidates} />
        </ErrorBoundary>
      </section>

      {/* Row 6: Raw Data */}
      <section aria-label="Detailed shipment data">
        <ErrorBoundary>
          <DataTable data={model.filteredRows} />
        </ErrorBoundary>
      </section>
    </div>
  );
});

function DashboardContent() {
  const [allData, setAllData] = useState<DiversionRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  const { toasts, dismissToast, showError } = useToast();

  // Extract filter options from all data (for date range defaults)
  // Memoized to prevent recalculation on every render
  const filterOptions = useMemo(() => {
    if (!allData || allData.length === 0) {
      return { branches: [], consignees: [], dateRange: { min: "", max: "" } };
    }
    return extractFilterOptions(allData);
  }, [allData]);

  // Use URL-synced filters with date range for defaults
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilterParams({
    dateRange: filterOptions.dateRange,
  });

  // Build dashboard model from data and filters
  // This is the main computation - memoized based on data and filters
  const model: DashboardModel | null = useMemo(() => {
    if (!allData || allData.length === 0) return null;
    return buildDashboardModel(allData, filters);
  }, [allData, filters]);

  // Check for large dataset
  const isLargeDataset = allData.length >= LARGE_DATASET_THRESHOLD;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setInitialLoadError(null);
    }

    try {
      const response = await fetch("/api/sheets");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Validate data is an array
      if (!Array.isArray(result.data)) {
        throw new Error("Invalid data format received from server");
      }

      setAllData(result.data);
      setLastUpdated(result.fetchedAt ?? new Date().toISOString());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";

      if (isRefresh) {
        // Non-blocking toast for refresh failures - keep old data
        showError(`Refresh failed: ${errorMessage}. Showing cached data.`);
      } else {
        // Blocking error for initial load failure
        setInitialLoadError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Memoized refresh handler
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Loading state (initial load only)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header lastUpdated={null} isRefreshing={false} onRefresh={handleRefresh} />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  // Error state (initial load failure only)
  if (initialLoadError) {
    return (
      <div className="min-h-screen bg-ft-gray-50">
        <Header lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6" role="alert">
          <div className="bg-ft-error/10 border border-ft-error/20 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-ft-error mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-ft-gray-900 mb-2">
              Failed to load data
            </h2>
            <p className="text-ft-gray-600 mb-6">{initialLoadError}</p>
            <button
              onClick={() => fetchData(false)}
              className="inline-flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark text-ft-black font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
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
        <Header lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg border border-ft-gray-200 p-12 text-center">
            <Truck className="w-16 h-16 text-ft-gray-300 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-ft-gray-900 mb-2">
              No data available
            </h2>
            <p className="text-ft-gray-500">
              The data source appears to be empty. Please check your Google Sheet.
            </p>
          </div>
        </main>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ft-gray-50">
      <Header lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={handleRefresh} />

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-40 bg-ft-gray-50 border-b border-ft-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Filters
            filters={filters}
            options={model.filterOptions}
            onChange={setFilter}
            onReset={resetFilters}
            totalCount={model.totalRows}
            filteredCount={model.filteredRows.length}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Performance warning for large datasets */}
        {isLargeDataset && (
          <PerformanceWarning rowCount={allData.length} />
        )}

        <ErrorBoundary>
          <DashboardSections model={model} resetFilters={resetFilters} />
        </ErrorBoundary>
      </main>

      {/* Toast notifications for non-blocking errors */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// Static header for Suspense fallback (no interactivity needed)
function StaticHeader() {
  return (
    <header className="bg-ft-black text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ft-yellow rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-ft-black" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Ultratech Diversion Dashboard
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-ft-gray-400">
                <Radio className="w-3 h-3 text-green-400 animate-pulse" aria-hidden="true" />
                <span>Live from Google Sheet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-ft-gray-50">
          <StaticHeader />
          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <LoadingSkeleton />
          </main>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}
