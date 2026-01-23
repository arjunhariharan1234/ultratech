"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, AlertTriangle } from "lucide-react";
import type { DiversionRow } from "@/lib/schema";
import { formatDate, formatNumber, formatCurrency } from "@/lib/transform";

interface DataTableProps {
  data: DiversionRow[];
}

type SortDirection = "asc" | "desc" | null;

interface Column {
  key: keyof DiversionRow;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: DiversionRow) => React.ReactNode;
  className?: string;
}

const columns: Column[] = [
  { key: "date", label: "Date", sortable: true, render: (v) => formatDate(v as string) },
  { key: "branchName", label: "Branch", sortable: true },
  { key: "vehicleNumber", label: "Vehicle", sortable: true },
  { key: "originLocation", label: "Origin", sortable: true },
  { key: "stopLocation", label: "Destination", sortable: true },
  {
    key: "diffInLead",
    label: "Diff in Lead",
    sortable: true,
    render: (v, row) => {
      const value = v as number | null;
      if (value === null) return "—";
      const isDiversion = row.isPotentialDiversion;
      return (
        <span className={`flex items-center gap-1 ${isDiversion ? "text-ft-error font-medium" : ""}`}>
          {isDiversion && <AlertTriangle className="w-3 h-3" />}
          {formatNumber(value, 1)} km
        </span>
      );
    },
    className: "text-right",
  },
  {
    key: "totalFreight",
    label: "Freight",
    sortable: true,
    render: (v) => formatCurrency(v as number | null),
    className: "text-right",
  },
  {
    key: "freightImpact",
    label: "Impact",
    sortable: true,
    render: (v) => {
      const value = v as number | null;
      if (value === null) return "—";
      const color = value < 0 ? "text-ft-success" : value > 0 ? "text-ft-error" : "";
      return <span className={color}>{formatCurrency(value)}</span>;
    },
    className: "text-right",
  },
  {
    key: "nearestConsignee",
    label: "Nearest Consignee",
    sortable: true,
    className: "max-w-[150px] truncate",
  },
  {
    key: "freightCalculationRemarks",
    label: "Remarks",
    sortable: true,
    className: "max-w-[180px] truncate",
  },
  { key: "loadStatus", label: "Status", sortable: true },
];

const PAGE_SIZE = 20;

export function DataTable({ data }: DataTableProps) {
  const [sortKey, setSortKey] = useState<keyof DiversionRow | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined || aVal === "") return 1;
      if (bVal === null || bVal === undefined || bVal === "") return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [data, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);

  const handleSort = (key: keyof DiversionRow) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (key: keyof DiversionRow) => {
    if (sortKey !== key) return <ChevronsUpDown className="w-4 h-4 text-ft-gray-400" />;
    if (sortDirection === "asc") return <ChevronUp className="w-4 h-4 text-ft-yellow" />;
    return <ChevronDown className="w-4 h-4 text-ft-yellow" />;
  };

  const handleExport = () => {
    const headers = columns.map((c) => c.label).join(",");
    const rows = sortedData.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") ? `"${str}"` : str;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ultratech-diversion-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count diversions in current data
  const diversionCount = data.filter((r) => r.isPotentialDiversion).length;

  return (
    <div className="bg-white rounded-lg border border-ft-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ft-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-ft-gray-900">
            Shipment Details
          </h3>
          {diversionCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ft-error/10 text-ft-error">
              <AlertTriangle className="w-3 h-3" />
              {diversionCount} potential diversion{diversionCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 text-sm text-ft-gray-600 hover:text-ft-gray-900 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-ft-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-ft-gray-600 uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer select-none hover:bg-ft-gray-100" : ""
                  } ${col.className || ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ft-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-ft-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-ft-gray-50 transition-colors ${
                    row.isPotentialDiversion ? "bg-ft-error/5" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-ft-gray-700 whitespace-nowrap ${col.className || ""}`}
                      title={
                        col.className?.includes("truncate")
                          ? String(row[col.key] || "")
                          : undefined
                      }
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-ft-gray-200 flex items-center justify-between">
          <p className="text-sm text-ft-gray-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(currentPage * PAGE_SIZE, sortedData.length)} of{" "}
            {sortedData.length.toLocaleString()} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-ft-gray-200 rounded hover:bg-ft-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-ft-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-ft-gray-200 rounded hover:bg-ft-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
