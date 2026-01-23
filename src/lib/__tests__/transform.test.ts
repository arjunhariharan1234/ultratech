import { describe, it, expect } from "vitest";
import type { DiversionRow } from "../schema";
import {
  applyFilters,
  calculateScorecards,
  calculateBranchChart,
  calculateConsigneeChart,
  calculateBranchTable,
  calculateConsigneeTable,
  calculateCorridorTable,
  calculatePenaltyCandidates,
  buildDashboardModel,
  extractFilterOptions,
  formatNumber,
  formatCurrency,
  formatDistance,
  parseDate,
  DEFAULT_FILTERS,
  type FilterState,
} from "../transform";

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

function createMockRow(overrides: Partial<DiversionRow> = {}): DiversionRow {
  return {
    id: "test-1",
    journeyId: "JRN-001",
    customerLoadId: "CL-001",
    loadId: "L-001",
    branchId: "B-001",
    branchName: "Test Branch",
    date: "01/12/2025",
    dateISO: "2025-12-01T00:00:00.000Z",
    createdAt: "2025-12-01T10:00:00.000Z",
    closedAt: "2025-12-02T10:00:00.000Z",
    loadStatus: "AFTER_DROP",
    originLocation: "Origin A",
    stopLocation: "Stop B",
    dropClosestPingAddress: "123 Test Street",
    nearestConsignee: "Consignee X",
    nearestConsigneeCode: "CX001",
    erpTransitDistanceKm: 50,
    aToCDistanceKm: 60,
    diffInLead: -10,
    totalDistanceTravelledKm: 65,
    totalFreight: 5000,
    nearestConsigneeTotalFreight: 4500,
    freightImpact: -500,
    isPotentialDiversion: true,
    shortLeadDistanceKm: 10,
    vehicleNumber: "WB-1234",
    vehicleType: "1101",
    freightCalculationRemarks: "on Nearest Consignee",
    statusOfTrackedMode: "TRUE",
    loadingTatHrs: 2.5,
    actualTransitTimeDays: 1.5,
    ...overrides,
  };
}

const mockRows: DiversionRow[] = [
  createMockRow({
    id: "1",
    journeyId: "JRN-001",
    branchName: "Burdwan Depot",
    nearestConsignee: "Consignee A",
    freightImpact: -1000,
    diffInLead: -15,
    shortLeadDistanceKm: 15,
    originLocation: "BURDWAN-T2",
    stopLocation: "MONGALKOT",
  }),
  createMockRow({
    id: "2",
    journeyId: "JRN-002",
    branchName: "Burdwan Depot",
    nearestConsignee: "Consignee B",
    freightImpact: -2000,
    diffInLead: -20,
    shortLeadDistanceKm: 20,
    originLocation: "BURDWAN-T2",
    stopLocation: "MONGALKOT",
  }),
  createMockRow({
    id: "3",
    journeyId: "JRN-003",
    branchName: "Sainthia Depot",
    nearestConsignee: "Consignee A",
    freightImpact: -1500,
    diffInLead: -25,
    shortLeadDistanceKm: 25,
    originLocation: "SAINTHIA-T4",
    stopLocation: "AYAS",
  }),
  createMockRow({
    id: "4",
    journeyId: "JRN-004",
    branchName: "Kalighat Depot",
    nearestConsignee: "Consignee C",
    freightImpact: -500,
    diffInLead: -5,
    shortLeadDistanceKm: 5,
    isPotentialDiversion: true,
    originLocation: "KALIGHAT-RH",
    stopLocation: "BUDGEBUDGE",
  }),
  createMockRow({
    id: "5",
    journeyId: "JRN-005",
    branchName: "Kalighat Depot",
    nearestConsignee: "Consignee D",
    freightImpact: 0,
    diffInLead: 5,
    shortLeadDistanceKm: 5,
    isPotentialDiversion: false, // Not a diversion (positive diff)
    originLocation: "KALIGHAT-RH",
    stopLocation: "METIABRUZ",
  }),
];

// =============================================================================
// FORMATTING TESTS
// =============================================================================

describe("formatNumber", () => {
  it("formats numbers with Indian locale", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
    expect(formatNumber(1000, 2)).toBe("1,000.00");
  });

  it("returns dash for null/undefined/NaN", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(NaN)).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("formats currency with INR symbol", () => {
    expect(formatCurrency(1000)).toBe("₹1,000");
    expect(formatCurrency(1234567)).toBe("₹12,34,567");
  });

  it("returns dash for null/undefined", () => {
    expect(formatCurrency(null)).toBe("—");
  });
});

describe("formatDistance", () => {
  it("formats distance with km suffix", () => {
    expect(formatDistance(15.5)).toBe("15.5 km");
    expect(formatDistance(100)).toBe("100.0 km");
  });
});

// =============================================================================
// DATE PARSING TESTS
// =============================================================================

describe("parseDate", () => {
  it("parses DD/MM/YYYY format", () => {
    const date = parseDate("01/12/2025");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2025);
    expect(date?.getMonth()).toBe(11); // December (0-indexed)
    expect(date?.getDate()).toBe(1);
  });

  it("parses ISO format", () => {
    const date = parseDate("2025-12-01T10:00:00.000Z");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2025);
  });

  it("parses YYYY-MM-DD format", () => {
    const date = parseDate("2025-12-01");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2025);
  });

  it("returns null for empty strings", () => {
    expect(parseDate("")).toBeNull();
  });
});

// =============================================================================
// FILTER TESTS
// =============================================================================

describe("applyFilters", () => {
  it("filters by onlyDiversions (default ON)", () => {
    const filtered = applyFilters(mockRows, DEFAULT_FILTERS);
    expect(filtered.length).toBe(4); // Excludes the non-diversion row
    expect(filtered.every((r) => r.isPotentialDiversion)).toBe(true);
  });

  it("shows all rows when onlyDiversions is OFF", () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, onlyDiversions: false };
    const filtered = applyFilters(mockRows, filters);
    expect(filtered.length).toBe(5);
  });

  it("filters by branch", () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, branch: "Burdwan Depot" };
    const filtered = applyFilters(mockRows, filters);
    expect(filtered.length).toBe(2);
    expect(filtered.every((r) => r.branchName === "Burdwan Depot")).toBe(true);
  });

  it("filters by consignee", () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, consignee: "Consignee A" };
    const filtered = applyFilters(mockRows, filters);
    expect(filtered.length).toBe(2);
    expect(filtered.every((r) => r.nearestConsignee === "Consignee A")).toBe(true);
  });

  it("filters by minimum freight impact", () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, minFreightImpact: -1000 };
    const filtered = applyFilters(mockRows, filters);
    // Should include rows with |impact| >= 1000
    expect(filtered.every((r) => Math.abs(r.freightImpact || 0) >= 1000)).toBe(true);
  });
});

describe("extractFilterOptions", () => {
  it("extracts unique branches", () => {
    const options = extractFilterOptions(mockRows);
    expect(options.branches).toContain("Burdwan Depot");
    expect(options.branches).toContain("Sainthia Depot");
    expect(options.branches).toContain("Kalighat Depot");
    expect(options.branches.length).toBe(3);
  });

  it("extracts unique consignees", () => {
    const options = extractFilterOptions(mockRows);
    expect(options.consignees).toContain("Consignee A");
    expect(options.consignees).toContain("Consignee B");
    expect(options.consignees.length).toBe(4);
  });
});

// =============================================================================
// SCORECARD TESTS
// =============================================================================

describe("calculateScorecards", () => {
  it("calculates total potential recovery", () => {
    const scorecards = calculateScorecards(mockRows);
    // Sum of |freight_impact| for diverted rows: 1000 + 2000 + 1500 + 500 = 5000
    expect(scorecards.totalPotentialRecovery).toBe(5000);
  });

  it("calculates average short lead distance", () => {
    const scorecards = calculateScorecards(mockRows);
    // Avg of [15, 20, 25, 5] = 65/4 = 16.25
    expect(scorecards.avgShortLeadDistance).toBe(16.25);
  });

  it("calculates max diverted distance", () => {
    const scorecards = calculateScorecards(mockRows);
    // Max of [15, 20, 25, 5] = 25
    expect(scorecards.maxDivertedDistance).toBe(25);
  });

  it("calculates total diverted journeys (distinct)", () => {
    const scorecards = calculateScorecards(mockRows);
    expect(scorecards.totalDivertedJourneys).toBe(4);
  });

  it("calculates total consignees involved (distinct)", () => {
    const scorecards = calculateScorecards(mockRows);
    // Consignees in diverted rows: A, B, A, C = 3 unique
    expect(scorecards.totalConsigneesInvolved).toBe(3);
  });

  it("calculates total branches with diversions (distinct)", () => {
    const scorecards = calculateScorecards(mockRows);
    expect(scorecards.totalBranchesWithDiversions).toBe(3);
  });
});

// =============================================================================
// CHART DATA TESTS
// =============================================================================

describe("calculateBranchChart", () => {
  it("returns branches sorted by recovery descending", () => {
    const chart = calculateBranchChart(mockRows);
    expect(chart[0].name).toBe("Burdwan Depot");
    expect(chart[0].recovery).toBe(3000); // 1000 + 2000
    expect(chart[0].count).toBe(2);
  });

  it("respects limit parameter", () => {
    const chart = calculateBranchChart(mockRows, 2);
    expect(chart.length).toBe(2);
  });
});

describe("calculateConsigneeChart", () => {
  it("returns consignees sorted by recovery descending", () => {
    const chart = calculateConsigneeChart(mockRows);
    expect(chart[0].name).toBe("Consignee A");
    expect(chart[0].recovery).toBe(2500); // 1000 + 1500
    expect(chart[0].count).toBe(2);
  });
});

// =============================================================================
// TABLE DATA TESTS
// =============================================================================

describe("calculateBranchTable", () => {
  it("calculates branch-wise metrics correctly", () => {
    const table = calculateBranchTable(mockRows);
    const burdwan = table.find((r) => r.branchName === "Burdwan Depot");

    expect(burdwan).toBeDefined();
    expect(burdwan?.divertedJourneys).toBe(2);
    expect(burdwan?.totalRecovery).toBe(3000);
    expect(burdwan?.avgShortLead).toBe(17.5); // (15 + 20) / 2
    expect(burdwan?.maxShortLead).toBe(20);
  });
});

describe("calculateConsigneeTable", () => {
  it("calculates consignee-wise metrics with repeat rate", () => {
    const table = calculateConsigneeTable(mockRows);
    const consigneeA = table.find((r) => r.consignee === "Consignee A");

    expect(consigneeA).toBeDefined();
    expect(consigneeA?.divertedJourneys).toBe(2);
    expect(consigneeA?.totalRecovery).toBe(2500);
    // repeatRate = 2/4 * 100 = 50%
    expect(consigneeA?.repeatRate).toBe(50);
  });
});

describe("calculateCorridorTable", () => {
  it("groups by origin-destination corridor", () => {
    const table = calculateCorridorTable(mockRows);
    const corridor = table.find((r) => r.corridor === "BURDWAN-T2 → MONGALKOT");

    expect(corridor).toBeDefined();
    expect(corridor?.count).toBe(2);
    expect(corridor?.totalRecovery).toBe(3000);
  });

  it("sorts by count descending", () => {
    const table = calculateCorridorTable(mockRows);
    expect(table[0].count).toBeGreaterThanOrEqual(table[1]?.count || 0);
  });
});

describe("calculatePenaltyCandidates", () => {
  it("returns rows sorted by freight impact (absolute)", () => {
    const candidates = calculatePenaltyCandidates(mockRows, 10);

    expect(candidates.length).toBe(4); // Only diverted rows
    expect(candidates[0].freightImpact).toBe(-2000); // Highest absolute value
    expect(candidates[1].freightImpact).toBe(-1500);
  });

  it("respects limit parameter", () => {
    const candidates = calculatePenaltyCandidates(mockRows, 2);
    expect(candidates.length).toBe(2);
  });

  it("includes required fields", () => {
    const candidates = calculatePenaltyCandidates(mockRows, 1);
    const candidate = candidates[0];

    expect(candidate).toHaveProperty("journeyId");
    expect(candidate).toHaveProperty("branchName");
    expect(candidate).toHaveProperty("consignee");
    expect(candidate).toHaveProperty("diffInLead");
    expect(candidate).toHaveProperty("freightImpact");
    expect(candidate).toHaveProperty("originLocation");
    expect(candidate).toHaveProperty("stopLocation");
    expect(candidate).toHaveProperty("dropClosestPingAddress");
  });
});

// =============================================================================
// DASHBOARD MODEL TESTS
// =============================================================================

describe("buildDashboardModel", () => {
  it("builds complete dashboard model", () => {
    const model = buildDashboardModel(mockRows, DEFAULT_FILTERS);

    expect(model.filteredRows.length).toBe(4);
    expect(model.totalRows).toBe(5);
    expect(model.filterOptions.branches.length).toBe(3);
    expect(model.scorecards.totalPotentialRecovery).toBe(5000);
    expect(model.branchChart.length).toBeGreaterThan(0);
    expect(model.consigneeChart.length).toBeGreaterThan(0);
    expect(model.branchTable.length).toBeGreaterThan(0);
    expect(model.consigneeTable.length).toBeGreaterThan(0);
    expect(model.corridorTable.length).toBeGreaterThan(0);
    expect(model.penaltyCandidates.length).toBeGreaterThan(0);
  });

  it("applies filters correctly", () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      branch: "Burdwan Depot",
    };
    const model = buildDashboardModel(mockRows, filters);

    expect(model.filteredRows.length).toBe(2);
    expect(model.filteredRows.every((r) => r.branchName === "Burdwan Depot")).toBe(true);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("edge cases", () => {
  it("handles empty array", () => {
    const model = buildDashboardModel([], DEFAULT_FILTERS);

    expect(model.filteredRows.length).toBe(0);
    expect(model.scorecards.totalPotentialRecovery).toBe(0);
    expect(model.scorecards.avgShortLeadDistance).toBe(0);
    expect(model.branchChart.length).toBe(0);
  });

  it("handles rows with null values", () => {
    const rowsWithNulls: DiversionRow[] = [
      createMockRow({
        id: "null-test",
        freightImpact: null,
        diffInLead: null,
        shortLeadDistanceKm: null,
      }),
    ];

    const scorecards = calculateScorecards(rowsWithNulls);
    expect(scorecards.totalPotentialRecovery).toBe(0);
    expect(scorecards.avgShortLeadDistance).toBe(0);
  });
});
