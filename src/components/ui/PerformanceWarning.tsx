"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface PerformanceWarningProps {
  rowCount: number;
  threshold?: number;
}

// Performance threshold for client-side processing
export const LARGE_DATASET_THRESHOLD = 50_000;

export function PerformanceWarning({
  rowCount,
  threshold = LARGE_DATASET_THRESHOLD
}: PerformanceWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (rowCount < threshold || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-800">
            Large Dataset Warning
          </h4>
          <p className="text-sm text-amber-700 mt-1">
            You have <strong>{rowCount.toLocaleString()}</strong> rows loaded.
            For datasets over {threshold.toLocaleString()} rows, consider enabling
            server-side aggregation for better performance.
          </p>
          {/* TODO: Implement server-side aggregation mode
              - Add API endpoint for pre-aggregated data
              - Switch to server-side filtering when threshold exceeded
              - Consider pagination for raw data table */}
          <p className="text-xs text-amber-600 mt-2">
            Tip: Use date filters to reduce the dataset size.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
