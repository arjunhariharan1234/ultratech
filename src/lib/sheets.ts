import Papa from "papaparse";
import { RawShipmentRowSchema, type ShipmentRecord, type RawShipmentRow } from "./schema";

const SHEET_ID = "1PzrfQBBcW2Ads2f97MDCGPVfA8SJDo1qu6xJOZCvbE0";
const TAB_NAME = "Sheet1";

// Build Google Sheets CSV export URL
function getSheetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB_NAME)}`;
}

// Transform raw row to normalized ShipmentRecord
function transformRow(raw: RawShipmentRow, index: number): ShipmentRecord {
  return {
    id: raw.customer_load_id || `row-${index}`,
    customerId: raw.customer_load_id || "",
    companyId: raw.company_id || "",
    journeyId: raw.journey_id || "",
    loadId: raw.load_id || "",
    branchId: raw.branch_id || "",
    branchName: raw.branch_name || "",
    invoiceNumbers: raw.invoice_numbers || "",
    branchShortCode: raw.branch_short_code || "",
    dropHaversineDistance: raw.drop_haversine_distance ?? null,
    createdAt: raw.created_at || "",
    date: raw.Date || "",
    totalInvoicedQty: raw.total_invoiced_qty ?? null,
    vehicleNumber: raw.vehicle_number || "",
    vehicleType: raw.vehicle_type || "",
    driverNumber: raw.driver_number || "",
    networkOperator: raw.network_operator || "",
    trackMode: raw.track_mode || "",
    statusOfTrackedMode: raw.status_of_tracked_mode || "",
    originEntryTime: raw.origin_entry_time_geofence || "",
    originExitTime: raw.origin_exit_time_geofence || "",
    closedAt: raw.closed_at || "",
    modeOfClosure: raw.mode_of_closure || "",
    totalDistanceTravelledKm: raw.total_distance_travelled_km ?? null,
    loadingTatHrs: raw.loading_TAT_in_hrs ?? null,
    actualTransitTimeDays: raw.actual_transit_time_in_days ?? null,
    loadStatus: raw.load_status || "",
    originLocation: raw.origin_location || "",
    stopLocation: raw.stop_location || "",
    pickupLat: raw.pickup_lat ?? null,
    pickupLng: raw.pickup_lng ?? null,
    dropLat: raw.drop_lat ?? null,
    dropLng: raw.drop_lng ?? null,
    ftConsentStatus: raw.ft_consent_status || "",
    erpTransitDistanceKm: raw.erp_transit_distance_km ?? null,
    dropClosestPingLat: raw.drop_closest_ping_lat ?? null,
    dropClosestPingLng: raw.drop_closest_ping_lng ?? null,
    dropGoogleDistanceMeters: raw.drop_google_distance_meters ?? null,
    dropClosestPingAddress: raw.drop_closest_ping_address || "",
    dropStopCode: raw.drop_stop_code || "",
    freight: raw.Freight ?? null,
    totalFreight: raw["Total Freight"] ?? null,
    nearestConsignee: raw["Nearest Consignee"] || "",
    nearestConsigneeCode: raw["Nearest Consignee Code"] || "",
    nearestConsigneeDistance: raw["Nearest Consignee distance"] ?? null,
    nearestConsigneeFreight: raw["Nearest Consignee Freight"] ?? null,
    nearestConsigneeTotalFreight: raw["Nearest Consignee Total Freight"] ?? null,
    secondNearestConsignee: raw["2nd Nearest Consignee"] || "",
    secondNearestConsigneeCode: raw["2nd Nearest Consignee Code"] || "",
    secondNearestConsigneeDistance: raw["2nd Nearest Consignee distance"] ?? null,
    secondNearestConsigneeFreight: raw["2nd Nearest Consignee Freight"] ?? null,
    secondNearestConsigneeTotalFreight: raw["2nd Nearest Consignee Total Freight"] ?? null,
    aToCDistance: raw["A to C Distance(vehicle travel)"] ?? null,
    diffInLead: raw["Diff in lead"] ?? null,
    freightImpact: raw["Freight impact as per PTPK/Nearest consignee"] ?? null,
    freightCalculationRemarks: raw["Freight calculation Remarks"] || "",
  };
}

// Fetch and parse sheet data
export async function fetchSheetData(): Promise<{
  data: ShipmentRecord[];
  fetchedAt: string;
  error?: string;
}> {
  const fetchedAt = new Date().toISOString();

  try {
    const url = getSheetUrl();
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/csv",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV
    const parseResult = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV parse warnings:", parseResult.errors);
    }

    // Validate and transform rows
    const records: ShipmentRecord[] = [];
    for (let i = 0; i < parseResult.data.length; i++) {
      try {
        const parsed = RawShipmentRowSchema.parse(parseResult.data[i]);
        records.push(transformRow(parsed, i));
      } catch (err) {
        console.warn(`Row ${i} validation failed:`, err);
        // Skip invalid rows but continue processing
      }
    }

    return { data: records, fetchedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error fetching sheet data";
    console.error("Sheet fetch error:", message);
    return { data: [], fetchedAt, error: message };
  }
}

// Export config for potential use elsewhere
export const sheetConfig = {
  sheetId: SHEET_ID,
  tabName: TAB_NAME,
  getUrl: getSheetUrl,
};
