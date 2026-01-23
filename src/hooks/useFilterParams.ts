"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format, subDays } from "date-fns";
import type { FilterState } from "@/lib/transform";

// Keys used in URL query params
const PARAM_KEYS = {
  dateFrom: "from",
  dateTo: "to",
  branch: "branch",
  consignee: "consignee",
  minFreightImpact: "minImpact",
  onlyDiversions: "diversions",
} as const;

interface UseFilterParamsOptions {
  dateRange?: { min: string; max: string };
}

export function useFilterParams(options: UseFilterParamsOptions = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Compute default date range (last 30 days from max date if available)
  const defaultDateFrom = useMemo(() => {
    if (options.dateRange?.max) {
      const maxDate = new Date(options.dateRange.max);
      const thirtyDaysAgo = subDays(maxDate, 30);
      // Clamp to min date if needed
      if (options.dateRange.min) {
        const minDate = new Date(options.dateRange.min);
        if (thirtyDaysAgo < minDate) {
          return options.dateRange.min;
        }
      }
      return format(thirtyDaysAgo, "yyyy-MM-dd");
    }
    return "";
  }, [options.dateRange]);

  // Parse filters from URL, falling back to defaults
  const filters: FilterState = useMemo(() => {
    const fromParam = searchParams.get(PARAM_KEYS.dateFrom);
    const toParam = searchParams.get(PARAM_KEYS.dateTo);
    const branchParam = searchParams.get(PARAM_KEYS.branch);
    const consigneeParam = searchParams.get(PARAM_KEYS.consignee);
    const minImpactParam = searchParams.get(PARAM_KEYS.minFreightImpact);
    const diversionsParam = searchParams.get(PARAM_KEYS.onlyDiversions);

    // Determine if URL has any filter params set
    const hasUrlParams = fromParam !== null || toParam !== null ||
      branchParam !== null || consigneeParam !== null ||
      minImpactParam !== null || diversionsParam !== null;

    return {
      dateFrom: fromParam ?? (hasUrlParams ? "" : defaultDateFrom),
      dateTo: toParam ?? "",
      branch: branchParam ?? "",
      consignee: consigneeParam ?? "",
      minFreightImpact: minImpactParam ? parseFloat(minImpactParam) : null,
      // Default to true (diversions only) unless explicitly set to "0" or "false"
      onlyDiversions: diversionsParam === null ? true : diversionsParam !== "0" && diversionsParam !== "false",
    };
  }, [searchParams, defaultDateFrom]);

  // Update a single filter in URL
  const setFilter = useCallback(
    (key: keyof FilterState, value: string | boolean | number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      const paramKey = PARAM_KEYS[key];

      if (value === null || value === "" || (key === "onlyDiversions" && value === true)) {
        // Remove param if it's the default value
        params.delete(paramKey);
      } else if (typeof value === "boolean") {
        params.set(paramKey, value ? "1" : "0");
      } else {
        params.set(paramKey, String(value));
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Update multiple filters at once
  const setFilters = useCallback(
    (updates: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = PARAM_KEYS[key as keyof FilterState];
        if (value === null || value === "" || (key === "onlyDiversions" && value === true)) {
          params.delete(paramKey);
        } else if (typeof value === "boolean") {
          params.set(paramKey, value ? "1" : "0");
        } else {
          params.set(paramKey, String(value));
        }
      });

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Reset all filters (clears URL params, returning to defaults)
  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // Check if any non-default filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.branch !== "" ||
      filters.consignee !== "" ||
      filters.minFreightImpact !== null ||
      !filters.onlyDiversions ||
      // Date filters are active if different from defaults
      filters.dateFrom !== defaultDateFrom ||
      filters.dateTo !== ""
    );
  }, [filters, defaultDateFrom]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters,
    defaultDateFrom,
  };
}
