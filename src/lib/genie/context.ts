/**
 * GenieContextBuilder - Packages dashboard data into compact context for LLM
 *
 * Hard constraints:
 * - No raw rows sent (only aggregated/top-N data)
 * - All numbers pre-computed from transform.ts
 * - Context size kept minimal for prompt efficiency
 */

import type {
  DashboardModel,
  FilterState,
  Scorecards,
  BranchTableRow,
  ConsigneeTableRow,
  CorridorTableRow,
  PenaltyCandidateRow,
} from "@/lib/transform";

// =============================================================================
// TYPES
// =============================================================================

export interface GenieContext {
  /** Human-readable summary of active filters */
  filterSummary: string;

  /** The 6 KPIs from scorecards */
  scorecards: {
    totalPotentialRecovery: number;
    avgShortLeadDistanceKm: number;
    maxDivertedDistanceKm: number;
    totalDivertedJourneys: number;
    totalConsigneesInvolved: number;
    totalBranchesWithDiversions: number;
  };

  /** Top 10 branches by recovery */
  topBranches: Array<{
    name: string;
    journeys: number;
    recovery: number;
    avgLeadKm: number;
  }>;

  /** Top 10 consignees by recovery */
  topConsignees: Array<{
    name: string;
    journeys: number;
    recovery: number;
    repeatPct: number;
  }>;

  /** Top 10 corridors by diversion count */
  topCorridors: Array<{
    corridor: string;
    count: number;
    recovery: number;
    avgLeadKm: number;
  }>;

  /** Top 20 penalty candidates by recovery amount */
  topPenaltyCandidates: Array<{
    journeyId: string;
    branch: string;
    consignee: string;
    recovery: number;
    leadKm: number;
    date: string;
  }>;

  /** Dataset statistics */
  datasetStats: {
    totalRows: number;
    filteredRows: number;
    dateRangeMin: string;
    dateRangeMax: string;
    lastUpdated: string;
  };
}

// =============================================================================
// FILTER SUMMARY BUILDER
// =============================================================================

function buildFilterSummary(filters: FilterState, model: DashboardModel): string {
  const parts: string[] = [];

  // Date range
  if (filters.dateFrom && filters.dateTo) {
    parts.push(`Date: ${filters.dateFrom} to ${filters.dateTo}`);
  } else if (filters.dateFrom) {
    parts.push(`From: ${filters.dateFrom}`);
  } else if (filters.dateTo) {
    parts.push(`Until: ${filters.dateTo}`);
  }

  // Branch filter
  if (filters.branch) {
    parts.push(`Branch: ${filters.branch}`);
  }

  // Consignee filter
  if (filters.consignee) {
    parts.push(`Consignee: ${filters.consignee}`);
  }

  // Minimum freight impact
  if (filters.minFreightImpact !== null && filters.minFreightImpact > 0) {
    parts.push(`Min Impact: ₹${filters.minFreightImpact}`);
  }

  // Diversions only
  if (filters.onlyDiversions) {
    parts.push("Diversions only");
  } else {
    parts.push("All loads");
  }

  // Row count context
  const filterInfo = parts.length > 0 ? parts.join(" | ") : "No filters applied";
  return `${filterInfo} → ${model.filteredRows.length} of ${model.totalRows} records`;
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export function buildGenieContext(
  model: DashboardModel,
  filters: FilterState,
  lastUpdated: string | null
): GenieContext {
  // Build filter summary
  const filterSummary = buildFilterSummary(filters, model);

  // Map scorecards (rename for clarity)
  const scorecards = {
    totalPotentialRecovery: round(model.scorecards.totalPotentialRecovery),
    avgShortLeadDistanceKm: round(model.scorecards.avgShortLeadDistance, 1),
    maxDivertedDistanceKm: round(model.scorecards.maxDivertedDistance, 1),
    totalDivertedJourneys: model.scorecards.totalDivertedJourneys,
    totalConsigneesInvolved: model.scorecards.totalConsigneesInvolved,
    totalBranchesWithDiversions: model.scorecards.totalBranchesWithDiversions,
  };

  // Top 10 branches
  const topBranches = model.branchTable.slice(0, 10).map((b) => ({
    name: b.branchName,
    journeys: b.divertedJourneys,
    recovery: round(b.totalRecovery),
    avgLeadKm: round(b.avgShortLead, 1),
  }));

  // Top 10 consignees
  const topConsignees = model.consigneeTable.slice(0, 10).map((c) => ({
    name: c.consignee,
    journeys: c.divertedJourneys,
    recovery: round(c.totalRecovery),
    repeatPct: round(c.repeatRate, 1),
  }));

  // Top 10 corridors
  const topCorridors = model.corridorTable.slice(0, 10).map((c) => ({
    corridor: c.corridor,
    count: c.count,
    recovery: round(c.totalRecovery),
    avgLeadKm: round(c.avgShortLead, 1),
  }));

  // Top 20 penalty candidates
  const topPenaltyCandidates = model.penaltyCandidates.slice(0, 20).map((p) => ({
    journeyId: p.journeyId,
    branch: p.branchName,
    consignee: p.consignee,
    recovery: round(p.recoveryAmount ?? 0),
    leadKm: round(p.shortLeadDistance ?? 0, 1),
    date: p.date,
  }));

  // Dataset stats
  const datasetStats = {
    totalRows: model.totalRows,
    filteredRows: model.filteredRows.length,
    dateRangeMin: model.filterOptions.dateRange.min,
    dateRangeMax: model.filterOptions.dateRange.max,
    lastUpdated: lastUpdated || new Date().toISOString(),
  };

  return {
    filterSummary,
    scorecards,
    topBranches,
    topConsignees,
    topCorridors,
    topPenaltyCandidates,
    datasetStats,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/** Round a number to specified decimal places */
function round(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Estimate token count for context (rough approximation)
 * ~4 chars per token on average
 */
export function estimateTokenCount(context: GenieContext): number {
  const json = JSON.stringify(context);
  return Math.ceil(json.length / 4);
}

/**
 * Log context in dev mode for debugging
 */
export function logGenieContext(context: GenieContext): void {
  if (process.env.NODE_ENV !== "development") return;

  const estimatedTokens = estimateTokenCount(context);
  const jsonSize = JSON.stringify(context).length;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    GENIE CONTEXT DEBUG                        ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║ Filter Summary: ${context.filterSummary.substring(0, 45).padEnd(45)} ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║ SCORECARDS                                                    ║");
  console.log(`║   Recovery: ₹${context.scorecards.totalPotentialRecovery.toLocaleString().padEnd(15)} Journeys: ${String(context.scorecards.totalDivertedJourneys).padEnd(10)} ║`);
  console.log(`║   Avg Lead: ${context.scorecards.avgShortLeadDistanceKm} km${" ".repeat(14)} Max Lead: ${context.scorecards.maxDivertedDistanceKm} km${" ".repeat(8)} ║`);
  console.log(`║   Branches: ${String(context.scorecards.totalBranchesWithDiversions).padEnd(18)} Consignees: ${String(context.scorecards.totalConsigneesInvolved).padEnd(10)} ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║ Top Branches (${context.topBranches.length}):  ${context.topBranches.slice(0, 3).map((b) => b.name).join(", ").substring(0, 40).padEnd(40)} ║`);
  console.log(`║ Top Consignees (${context.topConsignees.length}): ${context.topConsignees.slice(0, 3).map((c) => c.name).join(", ").substring(0, 38).padEnd(38)} ║`);
  console.log(`║ Top Corridors (${context.topCorridors.length}): ${context.topCorridors.slice(0, 2).map((c) => c.corridor).join(", ").substring(0, 39).padEnd(39)} ║`);
  console.log(`║ Penalty Candidates: ${context.topPenaltyCandidates.length.toString().padEnd(42)} ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║ Dataset: ${context.datasetStats.filteredRows}/${context.datasetStats.totalRows} rows | ${context.datasetStats.dateRangeMin} to ${context.datasetStats.dateRangeMax} `.padEnd(65) + "║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║ Context Size: ${jsonSize.toLocaleString()} bytes | ~${estimatedTokens.toLocaleString()} tokens`.padEnd(64) + "║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Also log full JSON in collapsed group
  console.groupCollapsed("📦 Full Genie Context JSON");
  console.log(JSON.stringify(context, null, 2));
  console.groupEnd();
}
