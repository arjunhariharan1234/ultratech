"use client";

import { Sparkles } from "lucide-react";

interface GenieButtonProps {
  onClick: () => void;
}

export function GenieButton({ onClick }: GenieButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-ft-yellow/10 hover:bg-ft-yellow/20 border border-ft-yellow/30 text-ft-yellow rounded-lg transition-colors"
      aria-label="Open Genie assistant"
    >
      <Sparkles className="w-4 h-4" />
      <span className="text-sm font-medium hidden sm:inline">Ask Genie</span>
    </button>
  );
}
