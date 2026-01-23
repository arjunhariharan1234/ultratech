import { z } from "zod";

// =============================================================================
// SAFE PARSING HELPERS
// =============================================================================

/**
 * Safely parse numeric values that may contain:
 * - Empty strings or blanks
 * - Commas as thousand separators (e.g., "1,234.56")
 * - String representations of numbers
 * - null/undefined values
 */
function safeParseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    // Remove commas (thousand separators) and whitespace
    const cleaned = value.replace(/,/g, "").trim();
    if (cleaned === "" || cleaned === "-") return null;

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Parse date strings into ISO format where possible.
 * Handles: DD/MM/YYYY, YYYY-MM-DD HH:mm:ss, and native Date parsing.
 */
function safeParseDateToISO(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  const str = String(value).trim();
  if (!str) return "";

  // Try DD/MM/YYYY format
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try YYYY-MM-DD HH:mm:ss format
  const isoLike = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (isoLike) {
    const date = new Date(str.replace(" ", "T"));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try native Date parsing as fallback
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Return original string if parsing fails
  return str;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

// Zod transformer for numeric values with comma/blank handling
const numericField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(safeParseNumber);

// Zod transformer for date values with ISO conversion
const dateField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => safeParseDateToISO(val));

// Zod transformer for string values with safe fallback
const stringField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val) => (val === null || val === undefined ? "" : String(val).trim()));

/**
 * Raw CSV row schema - matches Google Sheets column headers exactly.
 * Uses .passthrough() to allow unknown fields.
 */
export const RawRowSchema = z.object({
  // Identity
  journey_id: stringField,
  customer_load_id: stringField,
  load_id: stringField,
  branch_id: stringField,
  branch_name: stringField,
  Date: stringField,
  created_at: dateField,
  closed_at: dateField,
  load_status: stringField,

  // Location
  origin_location: stringField,
  stop_location: stringField,
  drop_closest_ping_address: stringField,
  "Nearest Consignee": stringField,
  "Nearest Consignee Code": stringField,

  // Distance
  erp_transit_distance_km: numericField,
  "A to C Distance(vehicle travel)": numericField,
  "Diff in lead": numericField,
  total_distance_travelled_km: numericField,

  // Commercial
  "Total Freight": numericField,
  "Nearest Consignee Total Freight": numericField,
  "Freight impact as per PTPK/Nearest consignee": numericField,
  Freight: numericField,

  // Additional fields for dashboard
  company_id: stringField,
  invoice_numbers: stringField,
  branch_short_code: stringField,
  drop_haversine_distance: numericField,
  total_invoiced_qty: numericField,
  vehicle_number: stringField,
  vehicle_type: stringField,
  driver_number: stringField,
  network_operator: stringField,
  track_mode: stringField,
  status_of_tracked_mode: stringField,
  origin_entry_time_geofence: dateField,
  origin_exit_time_geofence: dateField,
  mode_of_closure: stringField,
  loading_TAT_in_hrs: numericField,
  actual_transit_time_in_days: numericField,
  pickup_lat: numericField,
  pickup_lng: numericField,
  drop_lat: numericField,
  drop_lng: numericField,
  ft_consent_status: stringField,
  drop_closest_ping_lat: numericField,
  drop_closest_ping_lng: numericField,
  drop_google_distance_meters: numericField,
  drop_stop_code: stringField,
  "Nearest Consignee distance": numericField,
  "Nearest Consignee Freight": numericField,
  "2nd Nearest Consignee": stringField,
  "2nd Nearest Consignee Code": stringField,
  "2nd Nearest Consignee distance": numericField,
  "2nd Nearest Consignee Freight": numericField,
  "2nd Nearest Consignee Total Freight": numericField,
  "Freight calculation Remarks": stringField,
}).passthrough();

export type RawRow = z.infer<typeof RawRowSchema>;

// =============================================================================
// DIVERSION ROW TYPE
// =============================================================================

/**
 * Normalized DiversionRow - the canonical type for analytics and UI.
 * Contains only the essential fields needed for diversion analysis.
 */
export interface DiversionRow {
  // Identity
  id: string;
  journeyId: string;
  customerLoadId: string;
  loadId: string;
  branchId: string;
  branchName: string;
  date: string;           // Original date string for display
  dateISO: string;        // ISO formatted for sorting/filtering
  createdAt: string;      // ISO formatted
  closedAt: string;       // ISO formatted
  loadStatus: string;

  // Location
  originLocation: string;
  stopLocation: string;
  dropClosestPingAddress: string;
  nearestConsignee: string;
  nearestConsigneeCode: string;

  // Distance (all in km)
  erpTransitDistanceKm: number | null;      // Planned A→B distance
  aToCDistanceKm: number | null;            // Actual vehicle travel A→C
  diffInLead: number | null;                // Key: negative = potential diversion
  totalDistanceTravelledKm: number | null;  // Total GPS distance

  // Commercial (all in INR)
  totalFreight: number | null;
  nearestConsigneeTotalFreight: number | null;
  freightImpact: number | null;             // PTPK-based impact

  // Computed fields
  isPotentialDiversion: boolean;            // true if diffInLead < 0
  shortLeadDistanceKm: number | null;       // ABS(diffInLead) for analytics

  // Additional fields for full dashboard
  vehicleNumber: string;
  vehicleType: string;
  freightCalculationRemarks: string;
  statusOfTrackedMode: string;
  loadingTatHrs: number | null;
  actualTransitTimeDays: number | null;
}

// =============================================================================
// NORMALIZATION FUNCTION
// =============================================================================

/**
 * Transform a raw CSV row into a normalized DiversionRow.
 * Handles all type coercion, date parsing, and computed field generation.
 */
export function normalizeRow(rawRow: Record<string, unknown>, index: number): DiversionRow {
  // Parse through Zod schema for type safety
  const parsed = RawRowSchema.parse(rawRow);

  // Extract diffInLead for computed fields
  const diffInLead = parsed["Diff in lead"];

  // Parse the date field to ISO
  const dateISO = safeParseDateToISO(parsed.Date);

  return {
    // Identity
    id: parsed.customer_load_id || `row-${index}`,
    journeyId: parsed.journey_id || "",
    customerLoadId: parsed.customer_load_id || "",
    loadId: parsed.load_id || "",
    branchId: parsed.branch_id || "",
    branchName: parsed.branch_name || "",
    date: parsed.Date || "",
    dateISO,
    createdAt: parsed.created_at || "",
    closedAt: parsed.closed_at || "",
    loadStatus: parsed.load_status || "",

    // Location
    originLocation: parsed.origin_location || "",
    stopLocation: parsed.stop_location || "",
    dropClosestPingAddress: parsed.drop_closest_ping_address || "",
    nearestConsignee: parsed["Nearest Consignee"] || "",
    nearestConsigneeCode: parsed["Nearest Consignee Code"] || "",

    // Distance
    erpTransitDistanceKm: parsed.erp_transit_distance_km,
    aToCDistanceKm: parsed["A to C Distance(vehicle travel)"],
    diffInLead: diffInLead,
    totalDistanceTravelledKm: parsed.total_distance_travelled_km,

    // Commercial
    totalFreight: parsed["Total Freight"],
    nearestConsigneeTotalFreight: parsed["Nearest Consignee Total Freight"],
    freightImpact: parsed["Freight impact as per PTPK/Nearest consignee"],

    // Computed fields
    isPotentialDiversion: diffInLead !== null && diffInLead < 0,
    shortLeadDistanceKm: diffInLead !== null ? Math.abs(diffInLead) : null,

    // Additional dashboard fields
    vehicleNumber: parsed.vehicle_number || "",
    vehicleType: parsed.vehicle_type || "",
    freightCalculationRemarks: parsed["Freight calculation Remarks"] || "",
    statusOfTrackedMode: parsed.status_of_tracked_mode || "",
    loadingTatHrs: parsed.loading_TAT_in_hrs,
    actualTransitTimeDays: parsed.actual_transit_time_in_days,
  };
}

/**
 * Batch normalize multiple rows with error handling.
 * Skips rows that fail validation and logs warnings.
 */
export function normalizeRows(rawRows: Record<string, unknown>[]): DiversionRow[] {
  const results: DiversionRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    try {
      results.push(normalizeRow(rawRows[i], i));
    } catch (err) {
      console.warn(`Row ${i} normalization failed:`, err);
      // Skip invalid rows but continue processing
    }
  }

  return results;
}

// =============================================================================
// LEGACY TYPES (for backward compatibility)
// =============================================================================

// Alias for backward compatibility with existing code
export type ShipmentRecord = DiversionRow;

// Data fetch response
export interface SheetDataResponse {
  data: DiversionRow[];
  fetchedAt: string;
  error?: string;
}
