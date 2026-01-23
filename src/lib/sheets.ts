import Papa from "papaparse";
import { normalizeRows, type DiversionRow } from "./schema";

const SHEET_ID = "1PzrfQBBcW2Ads2f97MDCGPVfA8SJDo1qu6xJOZCvbE0";
const TAB_NAME = "Sheet1";

// Build Google Sheets CSV export URL
function getSheetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB_NAME)}`;
}

// Fetch and parse sheet data
export async function fetchSheetData(): Promise<{
  data: DiversionRow[];
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

    // Normalize rows using schema function
    const records = normalizeRows(parseResult.data);

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
