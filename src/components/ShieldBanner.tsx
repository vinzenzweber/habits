"use client";

import { useState, useEffect } from "react";

interface ShieldBannerProps {
  currentStreak: number;
}

/**
 * Banner that shows when a streak shield was auto-applied
 * Checks on mount and shows notification if shield was used
 */
export function ShieldBanner({ currentStreak }: ShieldBannerProps) {
  const [shieldApplied, setShieldApplied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if shield should be auto-applied
    const checkShield = async () => {
      try {
        const res = await fetch("/api/streak/check", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.shieldAutoApplied) {
            setShieldApplied(true);
          }
        }
      } catch (error) {
        console.error("Failed to check shield status:", error);
      }
    };

    checkShield();
  }, []);

  if (!shieldApplied || dismissed) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/50 to-slate-900/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label="Shield">
            🛡️
          </span>
          <div>
            <p className="font-medium text-blue-300">Streak Shield Activated!</p>
            <p className="mt-1 text-sm text-slate-400">
              Your {currentStreak}-day streak was protected. Keep it going today!
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          aria-label="Dismiss"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
