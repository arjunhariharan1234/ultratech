import { format, parse, isValid } from "date-fns";
import type { DiversionRow, FilterState, DashboardMetrics } from "./schema";

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Safe number formatting with locale support.
 * Returns "—" for null/undefined/NaN values.
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Safe currency formatting (INR).
 * Returns "—" for null/undefined/NaN values.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// =============================================================================
// DATE PARSING & FORMATTING
// =============================================================================

/**
 * Parse date from various formats.
 * Handles: DD/MM/YYYY, YYYY-MM-DD HH:mm:ss, ISO strings, and native parsing.
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format first (most common after normalization)
  if (dateStr.includes("T")) {
    const isoDate = new Date(dateStr);
    if (isValid(isoDate)) return isoDate;
  }

  // Try DD/MM/YYYY format
  const ddmmyyyy = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(ddmmyyyy)) return ddmmyyyy;

  // Try YYYY-MM-DD HH:mm:ss format
  const isoLike = parse(dateStr, "yyyy-MM-dd HH:mm:ss", new Date());
  if (isValid(isoLike)) return isoLike;

  // Try native Date parsing
  const native = new Date(dateStr);
  if (isValid(native)) return native;

  return null;
}

/**
 * Format date for display (e.g., "23 Jan 2026").
 */
export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "—";
  return format(date, "dd MMM yyyy");
}

/**
 * Format datetime for display (e.g., "23 Jan 2026, 14:30").
 */
export function formatDateTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "—";
  return format(date, "dd MMM yyyy, HH:mm");
}

// =============================================================================
// FILTER HELPERS
// =============================================================================

/**
 * Extract unique filter options from records.
 */
export function getFilterOptions(records: DiversionRow[]) {
  const branches = new Set<string>();
  const loadStatuses = new Set<string>();
  const vehicleTypes = new Set<string>();
  const freightRemarks = new Set<string>();

  records.forEach((r) => {
    if (r.branchName) branches.add(r.branchName);
    if (r.loadStatus) loadStatuses.add(r.loadStatus);
    if (r.vehicleType) vehicleTypes.add(r.vehicleType);
    if (r.freightCalculationRemarks) freightRemarks.add(r.freightCalculationRemarks);
  });

  return {
    branches: Array.from(branches).sort(),
    loadStatuses: Array.from(loadStatuses).sort(),
    vehicleTypes: Array.from(vehicleTypes).sort(),
    freightRemarks: Array.from(freightRemarks).sort(),
  };
}

/**
 * Apply filters to records (client-side filtering).
 */
export function applyFilters(
  records: DiversionRow[],
  filters: FilterState
): DiversionRow[] {
  return records.filter((r) => {
    // Branch filter
    if (filters.branch && r.branchName !== filters.branch) return false;

    // Load status filter
    if (filters.loadStatus && r.loadStatus !== filters.loadStatus) return false;

    // Vehicle type filter
    if (filters.vehicleType && r.vehicleType !== filters.vehicleType) return false;

    // Freight remarks filter
    if (filters.freightRemarks && r.freightCalculationRemarks !== filters.freightRemarks)
      return false;

    // Date range filter - use dateISO for accurate comparison
    if (filters.dateFrom || filters.dateTo) {
      // Prefer dateISO if available, fallback to date
      const recordDate = parseDate(r.dateISO || r.date);
      if (!recordDate) return false;

      if (filters.dateFrom) {
        const fromDate = parseDate(filters.dateFrom);
        if (fromDate && recordDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const toDate = parseDate(filters.dateTo);
        if (toDate && recordDate > toDate) return false;
      }
    }

    return true;
  });
}

// =============================================================================
// METRICS CALCULATION
// =============================================================================

/**
 * Calculate dashboard metrics from diversion records.
 * Includes diversion-specific metrics like potentialDiversions and shortLeadDistance.
 */
export function calculateMetrics(records: DiversionRow[]): DashboardMetrics {
  const loadsByBranch: Record<string, number> = {};
  const freightImpactByBranch: Record<string, number> = {};
  const loadsByStatus: Record<string, number> = {};
  const freightImpactByRemarks: Record<string, number> = {};
  const dailyData: Record<string, { loads: number; freightImpact: number; diversions: number }> = {};

  let totalFreightImpact = 0;
  let totalDistance = 0;
  let totalTransitTime = 0;
  let transitTimeCount = 0;
  let totalLoadingTat = 0;
  let loadingTatCount = 0;
  let trackedLoads = 0;
  let potentialDiversions = 0;
  let totalShortLeadDistance = 0;

  records.forEach((r) => {
    // Branch aggregations
    if (r.branchName) {
      loadsByBranch[r.branchName] = (loadsByBranch[r.branchName] || 0) + 1;
      if (r.freightImpact !== null) {
        freightImpactByBranch[r.branchName] =
          (freightImpactByBranch[r.branchName] || 0) + r.freightImpact;
      }
    }

    // Status aggregations
    if (r.loadStatus) {
      loadsByStatus[r.loadStatus] = (loadsByStatus[r.loadStatus] || 0) + 1;
    }

    // Freight remarks aggregations
    if (r.freightCalculationRemarks) {
      freightImpactByRemarks[r.freightCalculationRemarks] =
        (freightImpactByRemarks[r.freightCalculationRemarks] || 0) + (r.freightImpact || 0);
    }

    // Daily trends - use date field for grouping
    if (r.date) {
      const dateKey = r.date;
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { loads: 0, freightImpact: 0, diversions: 0 };
      }
      dailyData[dateKey].loads += 1;
      dailyData[dateKey].freightImpact += r.freightImpact || 0;
      if (r.isPotentialDiversion) {
        dailyData[dateKey].diversions += 1;
      }
    }

    // Totals
    if (r.freightImpact !== null) totalFreightImpact += r.freightImpact;
    if (r.totalDistanceTravelledKm !== null) totalDistance += r.totalDistanceTravelledKm;
    if (r.actualTransitTimeDays !== null) {
      totalTransitTime += r.actualTransitTimeDays;
      transitTimeCount++;
    }
    if (r.loadingTatHrs !== null) {
      totalLoadingTat += r.loadingTatHrs;
      loadingTatCount++;
    }
    if (r.statusOfTrackedMode === "TRUE" || r.statusOfTrackedMode === "true") {
      trackedLoads++;
    }

    // Diversion metrics
    if (r.isPotentialDiversion) {
      potentialDiversions++;
    }
    if (r.shortLeadDistanceKm !== null) {
      totalShortLeadDistance += r.shortLeadDistanceKm;
    }
  });

  // Convert daily data to sorted array
  const dailyTrends = Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

  return {
    totalLoads: records.length,
    totalFreightImpact,
    avgTransitTime: transitTimeCount > 0 ? totalTransitTime / transitTimeCount : 0,
    totalDistance,
    avgLoadingTat: loadingTatCount > 0 ? totalLoadingTat / loadingTatCount : 0,
    trackedLoads,
    potentialDiversions,
    totalShortLeadDistance,
    loadsByBranch,
    freightImpactByBranch,
    loadsByStatus,
    freightImpactByRemarks,
    dailyTrends,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get top N items from a record by value.
 * Useful for bar charts and rankings.
 */
export function getTopItems(
  data: Record<string, number>,
  n: number,
  sortDescending = true
): Array<{ name: string; value: number }> {
  return Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (sortDescending ? b.value - a.value : a.value - b.value))
    .slice(0, n);
}

/**
 * Calculate diversion rate as a percentage.
 */
export function calculateDiversionRate(records: DiversionRow[]): number {
  if (records.length === 0) return 0;
  const diversions = records.filter((r) => r.isPotentialDiversion).length;
  return (diversions / records.length) * 100;
}

/**
 * Get records that are potential diversions.
 */
export function getPotentialDiversions(records: DiversionRow[]): DiversionRow[] {
  return records.filter((r) => r.isPotentialDiversion);
}
