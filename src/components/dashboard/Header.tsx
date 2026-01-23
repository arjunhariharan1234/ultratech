import { Truck, RefreshCw, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/transform";

interface HeaderProps {
  lastUpdated: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function Header({ lastUpdated, isRefreshing, onRefresh }: HeaderProps) {
  return (
    <header className="bg-ft-black text-white sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ft-yellow rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-ft-black" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Ultratech Diversion Dashboard</h1>
            </div>
          </div>

          {/* Last Updated + Refresh */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-2 text-ft-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>Last updated: {formatDateTime(lastUpdated)}</span>
              </div>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-ft-yellow hover:bg-ft-yellow-dark disabled:opacity-50 text-ft-black font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
