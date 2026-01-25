"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { NANO_WEEKLY_LIMIT } from "@/lib/nanoWorkout";

interface NanoWorkoutCardProps {
  nanoRemaining: number;
  hasCompletedToday: boolean;
}

/**
 * Card that prompts user to do a nano workout instead of full workout
 * Shown when user hasn't completed today's workout and has nano workouts remaining
 */
export function NanoWorkoutCard({
  nanoRemaining,
  hasCompletedToday,
}: NanoWorkoutCardProps) {
  const t = useTranslations('nanoWorkout');

  // Don't show if already completed today or no nano workouts remaining
  if (hasCompletedToday || nanoRemaining <= 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-slate-900/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label="Lightning">
            ⚡
          </span>
          <div>
            <p className="font-medium text-purple-300">{t('notFeelingIt')}</p>
            <p className="mt-1 text-sm text-slate-400">
              {t('doNanoWorkout')}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {t('nanoRemaining', { remaining: nanoRemaining, limit: NANO_WEEKLY_LIMIT })}
            </p>
          </div>
        </div>
        <Link
          href="/workouts/nano"
          className="shrink-0 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          {t('startNano')}
        </Link>
      </div>
    </div>
  );
}
