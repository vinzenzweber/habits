"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface ShieldBannerProps {
  currentStreak: number;
}

type ProtectionType = "shield" | "restDay" | null;

/**
 * Banner that shows when a streak shield or rest day was auto-applied
 * Checks on mount and shows notification if protection was used
 * Uses a ref to prevent duplicate API calls on remounts
 */
export function ShieldBanner({ currentStreak }: ShieldBannerProps) {
  const t = useTranslations('shieldBanner');
  const [protectionType, setProtectionType] = useState<ProtectionType>(null);
  const [dismissed, setDismissed] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Prevent duplicate checks on remount
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Check if protection should be auto-applied
    const checkProtection = async () => {
      try {
        const res = await fetch("/api/streak/check", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.shieldAutoApplied) {
            setProtectionType("shield");
          } else if (data.restDayApplied) {
            setProtectionType("restDay");
          }
        }
      } catch (error) {
        console.error("Failed to check protection status:", error);
      }
    };

    checkProtection();
  }, []);

  if (!protectionType || dismissed) {
    return null;
  }

  const isRestDay = protectionType === "restDay";

  return (
    <div className={`rounded-2xl border p-4 ${
      isRestDay
        ? "border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-slate-900/50"
        : "border-blue-500/30 bg-gradient-to-r from-blue-950/50 to-slate-900/50"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label={isRestDay ? "Rest" : "Shield"}>
            {isRestDay ? "😴" : "🛡️"}
          </span>
          <div>
            <p className={`font-medium ${isRestDay ? "text-emerald-300" : "text-blue-300"}`}>
              {isRestDay ? t('restDayUsed') : t('shieldActivated')}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {t('streakProtected', { count: currentStreak })}
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
