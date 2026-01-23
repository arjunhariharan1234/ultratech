import { z } from "zod";

// Helper to parse numeric values that might be empty strings
const numericString = z
  .union([z.string(), z.number(), z.null()])
  .transform((val) => {
    if (val === null || val === "" || val === undefined) return null;
    const num = typeof val === "number" ? val : parseFloat(val);
    return isNaN(num) ? null : num;
  });

// Helper to parse date strings
const dateString = z
  .union([z.string(), z.null()])
  .transform((val) => (val === null || val === "" ? "" : String(val)));

// Raw CSV row schema (matches Google Sheets column headers)
export const RawShipmentRowSchema = z.object({
  customer_load_id: z.string().optional().default(""),
  company_id: z.string().optional().default(""),
  journey_id: z.string().optional().default(""),
  load_id: z.string().optional().default(""),
  branch_id: z.string().optional().default(""),
  branch_name: z.string().optional().default(""),
  invoice_numbers: z.string().optional().default(""),
  branch_short_code: z.string().optional().default(""),
  drop_haversine_distance: numericString.optional(),
  created_at: dateString.optional(),
  Date: dateString.optional(),
  total_invoiced_qty: numericString.optional(),
  vehicle_number: z.string().optional().default(""),
  vehicle_type: z.string().optional().default(""),
  driver_number: z.string().optional().default(""),
  network_operator: z.string().optional().default(""),
  track_mode: z.string().optional().default(""),
  status_of_tracked_mode: z.string().optional().default(""),
  origin_entry_time_geofence: dateString.optional(),
  origin_exit_time_geofence: dateString.optional(),
  closed_at: dateString.optional(),
  mode_of_closure: z.string().optional().default(""),
  total_distance_travelled_km: numericString.optional(),
  loading_TAT_in_hrs: numericString.optional(),
  actual_transit_time_in_days: numericString.optional(),
  load_status: z.string().optional().default(""),
  origin_location: z.string().optional().default(""),
  stop_location: z.string().optional().default(""),
  pickup_lat: numericString.optional(),
  pickup_lng: numericString.optional(),
  drop_lat: numericString.optional(),
  drop_lng: numericString.optional(),
  ft_consent_status: z.string().optional().default(""),
  erp_transit_distance_km: numericString.optional(),
  drop_closest_ping_lat: numericString.optional(),
  drop_closest_ping_lng: numericString.optional(),
  drop_google_distance_meters: numericString.optional(),
  drop_closest_ping_address: z.string().optional().default(""),
  drop_stop_code: z.string().optional().default(""),
  Freight: numericString.optional(),
  "Total Freight": numericString.optional(),
  "Nearest Consignee": z.string().optional().default(""),
  "Nearest Consignee Code": z.string().optional().default(""),
  "Nearest Consignee distance": numericString.optional(),
  "Nearest Consignee Freight": numericString.optional(),
  "Nearest Consignee Total Freight": numericString.optional(),
  "2nd Nearest Consignee": z.string().optional().default(""),
  "2nd Nearest Consignee Code": z.string().optional().default(""),
  "2nd Nearest Consignee distance": numericString.optional(),
  "2nd Nearest Consignee Freight": numericString.optional(),
  "2nd Nearest Consignee Total Freight": numericString.optional(),
  "A to C Distance(vehicle travel)": numericString.optional(),
  "Diff in lead": numericString.optional(),
  "Freight impact as per PTPK/Nearest consignee": numericString.optional(),
  "Freight calculation Remarks": z.string().optional().default(""),
});

export type RawShipmentRow = z.infer<typeof RawShipmentRowSchema>;

// Normalized shipment record for dashboard use
export interface ShipmentRecord {
  id: string;
  customerId: string;
  companyId: string;
  journeyId: string;
  loadId: string;
  branchId: string;
  branchName: string;
  invoiceNumbers: string;
  branchShortCode: string;
  dropHaversineDistance: number | null;
  createdAt: string;
  date: string;
  totalInvoicedQty: number | null;
  vehicleNumber: string;
  vehicleType: string;
  driverNumber: string;
  networkOperator: string;
  trackMode: string;
  statusOfTrackedMode: string;
  originEntryTime: string;
  originExitTime: string;
  closedAt: string;
  modeOfClosure: string;
  totalDistanceTravelledKm: number | null;
  loadingTatHrs: number | null;
  actualTransitTimeDays: number | null;
  loadStatus: string;
  originLocation: string;
  stopLocation: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropLat: number | null;
  dropLng: number | null;
  ftConsentStatus: string;
  erpTransitDistanceKm: number | null;
  dropClosestPingLat: number | null;
  dropClosestPingLng: number | null;
  dropGoogleDistanceMeters: number | null;
  dropClosestPingAddress: string;
  dropStopCode: string;
  freight: number | null;
  totalFreight: number | null;
  nearestConsignee: string;
  nearestConsigneeCode: string;
  nearestConsigneeDistance: number | null;
  nearestConsigneeFreight: number | null;
  nearestConsigneeTotalFreight: number | null;
  secondNearestConsignee: string;
  secondNearestConsigneeCode: string;
  secondNearestConsigneeDistance: number | null;
  secondNearestConsigneeFreight: number | null;
  secondNearestConsigneeTotalFreight: number | null;
  aToCDistance: number | null;
  diffInLead: number | null;
  freightImpact: number | null;
  freightCalculationRemarks: string;
}

// Filter state
export interface FilterState {
  branch: string;
  dateFrom: string;
  dateTo: string;
  loadStatus: string;
  vehicleType: string;
  freightRemarks: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalLoads: number;
  totalFreightImpact: number;
  avgTransitTime: number;
  totalDistance: number;
  avgLoadingTat: number;
  trackedLoads: number;
  loadsByBranch: Record<string, number>;
  freightImpactByBranch: Record<string, number>;
  loadsByStatus: Record<string, number>;
  freightImpactByRemarks: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    loads: number;
    freightImpact: number;
  }>;
}

// Data fetch response
export interface SheetDataResponse {
  data: ShipmentRecord[];
  fetchedAt: string;
  error?: string;
}
