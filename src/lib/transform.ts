import { format, parse, isValid } from "date-fns";
import type { DiversionRow } from "./schema";

// =============================================================================
// TYPES
// =============================================================================

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  branch: string;
  consignee: string;
  minFreightImpact: number | null;
  onlyDiversions: boolean; // default: true
}

export const DEFAULT_FILTERS: FilterState = {
  dateFrom: "",
  dateTo: "",
  branch: "",
  consignee: "",
  minFreightImpact: null,
  onlyDiversions: true,
};

export interface Scorecards {
  totalPotentialRecovery: number;
  avgShortLeadDistance: number;
  maxDivertedDistance: number;
  totalDivertedJourneys: number;
  totalConsigneesInvolved: number;
  totalBranchesWithDiversions: number;
}

export interface ChartDataPoint {
  name: string;
  recovery: number;
  count: number;
}

export interface BranchTableRow {
  branchName: string;
  divertedJourneys: number;
  totalRecovery: number;
  avgShortLead: number;
  maxShortLead: number;
}

export interface ConsigneeTableRow {
  consignee: string;
  divertedJourneys: number;
  totalRecovery: number;
  repeatRate: number; // journeys / total filtered journeys
}

export interface CorridorTableRow {
  origin: string;
  destination: string;
  corridor: string; // "origin → destination"
  count: number;
  totalRecovery: number;
  avgShortLead: number;
}

export interface PenaltyCandidateRow {
  journeyId: string;
  branchName: string;
  consignee: string;
  diffInLead: number | null;
  freightImpact: number | null;
  originLocation: string;
  stopLocation: string;
  dropClosestPingAddress: string;
  date: string;
}

export interface DashboardModel {
  // Filtered data
  filteredRows: DiversionRow[];
  totalRows: number;

  // Filter options (derived from all data)
  filterOptions: {
    branches: string[];
    consignees: string[];
    dateRange: { min: string; max: string };
  };

  // Scorecards
  scorecards: Scorecards;

  // Charts
  branchChart: ChartDataPoint[];
  consigneeChart: ChartDataPoint[];

  // Tables
  branchTable: BranchTableRow[];
  consigneeTable: ConsigneeTableRow[];
  corridorTable: CorridorTableRow[];
  penaltyCandidates: PenaltyCandidateRow[];
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatDistance(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return `${formatNumber(value, 1)} km`;
}

// =============================================================================
// DATE HELPERS
// =============================================================================

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // ISO format
  if (dateStr.includes("T")) {
    const isoDate = new Date(dateStr);
    if (isValid(isoDate)) return isoDate;
  }

  // DD/MM/YYYY
  const ddmmyyyy = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(ddmmyyyy)) return ddmmyyyy;

  // YYYY-MM-DD HH:mm:ss
  const isoLike = parse(dateStr, "yyyy-MM-dd HH:mm:ss", new Date());
  if (isValid(isoLike)) return isoLike;

  // YYYY-MM-DD
  const ymd = parse(dateStr, "yyyy-MM-dd", new Date());
  if (isValid(ymd)) return ymd;

  // Native fallback
  const native = new Date(dateStr);
  if (isValid(native)) return native;

  return null;
}

export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "—";
  return format(date, "dd MMM yyyy");
}

export function formatDateTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "—";
  return format(date, "dd MMM yyyy, HH:mm");
}

// =============================================================================
// FILTER OPTIONS EXTRACTION
// =============================================================================

export function extractFilterOptions(rows: DiversionRow[]) {
  const branches = new Set<string>();
  const consignees = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  rows.forEach((r) => {
    if (r.branchName) branches.add(r.branchName);
    if (r.nearestConsignee) consignees.add(r.nearestConsignee);

    const date = parseDate(r.dateISO || r.date);
    if (date) {
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
  });

  return {
    branches: Array.from(branches).sort(),
    consignees: Array.from(consignees).sort(),
    dateRange: {
      min: minDate ? format(minDate, "yyyy-MM-dd") : "",
      max: maxDate ? format(maxDate, "yyyy-MM-dd") : "",
    },
  };
}

// =============================================================================
// FILTERING
// =============================================================================

export function applyFilters(rows: DiversionRow[], filters: FilterState): DiversionRow[] {
  return rows.filter((r) => {
    // Only diversions filter (default ON)
    if (filters.onlyDiversions && !r.isPotentialDiversion) {
      return false;
    }

    // Branch filter
    if (filters.branch && r.branchName !== filters.branch) {
      return false;
    }

    // Consignee filter
    if (filters.consignee && r.nearestConsignee !== filters.consignee) {
      return false;
    }

    // Minimum freight impact threshold
    if (filters.minFreightImpact !== null && filters.minFreightImpact !== 0) {
      const impact = r.freightImpact;
      if (impact === null || Math.abs(impact) < Math.abs(filters.minFreightImpact)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const recordDate = parseDate(r.dateISO || r.date);
      if (!recordDate) return false;

      if (filters.dateFrom) {
        const fromDate = parseDate(filters.dateFrom);
        if (fromDate && recordDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const toDate = parseDate(filters.dateTo);
        if (toDate) {
          // Include the entire end date
          toDate.setHours(23, 59, 59, 999);
          if (recordDate > toDate) return false;
        }
      }
    }

    return true;
  });
}

// =============================================================================
// SCORECARD CALCULATIONS
// =============================================================================

export function calculateScorecards(rows: DiversionRow[]): Scorecards {
  // Filter to only diverted rows for most metrics
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);

  // 1) Total Potential recovery = SUM(freight_impact)
  // Note: freight_impact is typically negative for diversions (savings opportunity)
  // We take absolute value for "recovery" framing
  const totalPotentialRecovery = divertedRows.reduce((sum, r) => {
    return sum + Math.abs(r.freightImpact || 0);
  }, 0);

  // 2) Average short lead distance = AVG(ABS(diff_in_lead)) over diverted rows
  const shortLeadDistances = divertedRows
    .map((r) => r.shortLeadDistanceKm)
    .filter((d): d is number => d !== null);
  const avgShortLeadDistance =
    shortLeadDistances.length > 0
      ? shortLeadDistances.reduce((sum, d) => sum + d, 0) / shortLeadDistances.length
      : 0;

  // 3) Maximum diverted distance = MAX(ABS(diff_in_lead)) over diverted rows
  const maxDivertedDistance =
    shortLeadDistances.length > 0 ? Math.max(...shortLeadDistances) : 0;

  // 4) Total diverted journeys = COUNT(distinct journey_id) over diverted rows
  const uniqueJourneys = new Set(divertedRows.map((r) => r.journeyId).filter(Boolean));
  const totalDivertedJourneys = uniqueJourneys.size;

  // 5) Total consignees involved = COUNT(distinct Nearest Consignee) over diverted rows
  const uniqueConsignees = new Set(divertedRows.map((r) => r.nearestConsignee).filter(Boolean));
  const totalConsigneesInvolved = uniqueConsignees.size;

  // 6) Total branches with diversions = COUNT(distinct branch_name) over diverted rows
  const uniqueBranches = new Set(divertedRows.map((r) => r.branchName).filter(Boolean));
  const totalBranchesWithDiversions = uniqueBranches.size;

  return {
    totalPotentialRecovery,
    avgShortLeadDistance,
    maxDivertedDistance,
    totalDivertedJourneys,
    totalConsigneesInvolved,
    totalBranchesWithDiversions,
  };
}

// =============================================================================
// CHART DATA
// =============================================================================

export function calculateBranchChart(rows: DiversionRow[], limit = 10): ChartDataPoint[] {
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);
  const branchMap = new Map<string, { recovery: number; count: number }>();

  divertedRows.forEach((r) => {
    if (!r.branchName) return;
    const existing = branchMap.get(r.branchName) || { recovery: 0, count: 0 };
    existing.recovery += Math.abs(r.freightImpact || 0);
    existing.count += 1;
    branchMap.set(r.branchName, existing);
  });

  return Array.from(branchMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.recovery - a.recovery)
    .slice(0, limit);
}

export function calculateConsigneeChart(rows: DiversionRow[], limit = 10): ChartDataPoint[] {
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);
  const consigneeMap = new Map<string, { recovery: number; count: number }>();

  divertedRows.forEach((r) => {
    if (!r.nearestConsignee) return;
    const existing = consigneeMap.get(r.nearestConsignee) || { recovery: 0, count: 0 };
    existing.recovery += Math.abs(r.freightImpact || 0);
    existing.count += 1;
    consigneeMap.set(r.nearestConsignee, existing);
  });

  return Array.from(consigneeMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.recovery - a.recovery)
    .slice(0, limit);
}

// =============================================================================
// TABLE DATA
// =============================================================================

/**
 * Branch-wise table: branch_name, diverted_journeys, total_recovery, avg_short_lead, max_short_lead
 */
export function calculateBranchTable(rows: DiversionRow[]): BranchTableRow[] {
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);
  const branchMap = new Map<
    string,
    { journeys: Set<string>; recovery: number; shortLeads: number[] }
  >();

  divertedRows.forEach((r) => {
    if (!r.branchName) return;
    const existing = branchMap.get(r.branchName) || {
      journeys: new Set<string>(),
      recovery: 0,
      shortLeads: [],
    };
    if (r.journeyId) existing.journeys.add(r.journeyId);
    existing.recovery += Math.abs(r.freightImpact || 0);
    if (r.shortLeadDistanceKm !== null) {
      existing.shortLeads.push(r.shortLeadDistanceKm);
    }
    branchMap.set(r.branchName, existing);
  });

  return Array.from(branchMap.entries())
    .map(([branchName, data]) => ({
      branchName,
      divertedJourneys: data.journeys.size,
      totalRecovery: data.recovery,
      avgShortLead:
        data.shortLeads.length > 0
          ? data.shortLeads.reduce((a, b) => a + b, 0) / data.shortLeads.length
          : 0,
      maxShortLead: data.shortLeads.length > 0 ? Math.max(...data.shortLeads) : 0,
    }))
    .sort((a, b) => b.totalRecovery - a.totalRecovery);
}

/**
 * Consignee table: consignee, diverted_journeys, total_recovery, repeat_rate
 */
export function calculateConsigneeTable(rows: DiversionRow[]): ConsigneeTableRow[] {
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);
  const totalJourneys = new Set(divertedRows.map((r) => r.journeyId).filter(Boolean)).size;

  const consigneeMap = new Map<string, { journeys: Set<string>; recovery: number }>();

  divertedRows.forEach((r) => {
    if (!r.nearestConsignee) return;
    const existing = consigneeMap.get(r.nearestConsignee) || {
      journeys: new Set<string>(),
      recovery: 0,
    };
    if (r.journeyId) existing.journeys.add(r.journeyId);
    existing.recovery += Math.abs(r.freightImpact || 0);
    consigneeMap.set(r.nearestConsignee, existing);
  });

  return Array.from(consigneeMap.entries())
    .map(([consignee, data]) => ({
      consignee,
      divertedJourneys: data.journeys.size,
      totalRecovery: data.recovery,
      repeatRate: totalJourneys > 0 ? (data.journeys.size / totalJourneys) * 100 : 0,
    }))
    .sort((a, b) => b.totalRecovery - a.totalRecovery);
}

/**
 * Corridor table: origin + stop grouped, count, total_recovery, avg_short_lead
 */
export function calculateCorridorTable(rows: DiversionRow[]): CorridorTableRow[] {
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);
  const corridorMap = new Map<
    string,
    { origin: string; destination: string; count: number; recovery: number; shortLeads: number[] }
  >();

  divertedRows.forEach((r) => {
    const origin = r.originLocation || "Unknown";
    const destination = r.stopLocation || "Unknown";
    const key = `${origin}|||${destination}`;

    const existing = corridorMap.get(key) || {
      origin,
      destination,
      count: 0,
      recovery: 0,
      shortLeads: [],
    };
    existing.count += 1;
    existing.recovery += Math.abs(r.freightImpact || 0);
    if (r.shortLeadDistanceKm !== null) {
      existing.shortLeads.push(r.shortLeadDistanceKm);
    }
    corridorMap.set(key, existing);
  });

  return Array.from(corridorMap.values())
    .map((data) => ({
      origin: data.origin,
      destination: data.destination,
      corridor: `${data.origin} → ${data.destination}`,
      count: data.count,
      totalRecovery: data.recovery,
      avgShortLead:
        data.shortLeads.length > 0
          ? data.shortLeads.reduce((a, b) => a + b, 0) / data.shortLeads.length
          : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Penalty candidates: sorted by freight_impact desc (top N rows)
 */
export function calculatePenaltyCandidates(
  rows: DiversionRow[],
  limit = 20
): PenaltyCandidateRow[] {
  const divertedRows = rows.filter((r) => r.isPotentialDiversion);

  return divertedRows
    .filter((r) => r.freightImpact !== null)
    .sort((a, b) => Math.abs(b.freightImpact || 0) - Math.abs(a.freightImpact || 0))
    .slice(0, limit)
    .map((r) => ({
      journeyId: r.journeyId,
      branchName: r.branchName,
      consignee: r.nearestConsignee,
      diffInLead: r.diffInLead,
      freightImpact: r.freightImpact,
      originLocation: r.originLocation,
      stopLocation: r.stopLocation,
      dropClosestPingAddress: r.dropClosestPingAddress,
      date: r.date,
    }));
}

// =============================================================================
// MAIN DASHBOARD MODEL BUILDER
// =============================================================================

export function buildDashboardModel(
  allRows: DiversionRow[],
  filters: FilterState
): DashboardModel {
  // Extract filter options from ALL data (not filtered)
  const filterOptions = extractFilterOptions(allRows);

  // Apply filters
  const filteredRows = applyFilters(allRows, filters);

  // Calculate all derived data
  const scorecards = calculateScorecards(filteredRows);
  const branchChart = calculateBranchChart(filteredRows);
  const consigneeChart = calculateConsigneeChart(filteredRows);
  const branchTable = calculateBranchTable(filteredRows);
  const consigneeTable = calculateConsigneeTable(filteredRows);
  const corridorTable = calculateCorridorTable(filteredRows);
  const penaltyCandidates = calculatePenaltyCandidates(filteredRows);

  return {
    filteredRows,
    totalRows: allRows.length,
    filterOptions,
    scorecards,
    branchChart,
    consigneeChart,
    branchTable,
    consigneeTable,
    corridorTable,
    penaltyCandidates,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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

export function calculateDiversionRate(rows: DiversionRow[]): number {
  if (rows.length === 0) return 0;
  const diversions = rows.filter((r) => r.isPotentialDiversion).length;
  return (diversions / rows.length) * 100;
}

export function getPotentialDiversions(rows: DiversionRow[]): DiversionRow[] {
  return rows.filter((r) => r.isPotentialDiversion);
}
