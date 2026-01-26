"use client";

import { Sparkles } from "lucide-react";

interface GenieButtonProps {
  onClick: () => void;
}

export function GenieButton({ onClick }: GenieButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-2 px-3 py-2 bg-ft-yellow/10 hover:bg-ft-yellow/20 border border-ft-yellow/30 hover:border-ft-yellow/50 text-ft-yellow rounded-lg transition-all duration-300"
      aria-label="Open Genie assistant"
    >
      {/* Glow effect behind the icon */}
      <span className="absolute left-2.5 w-5 h-5 bg-ft-yellow/40 rounded-full blur-md animate-genie-glow" />

      {/* Sparkles icon with pulse animation */}
      <Sparkles className="relative w-4 h-4 animate-genie-sparkle" />

      <span className="text-sm font-medium hidden sm:inline">Ask Genie</span>
    </button>
  );
}
