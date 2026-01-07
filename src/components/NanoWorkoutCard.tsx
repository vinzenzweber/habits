"use client";

import Link from "next/link";
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
            <p className="font-medium text-purple-300">Not feeling it today?</p>
            <p className="mt-1 text-sm text-slate-400">
              Do a 3-minute nano workout to save your streak
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {nanoRemaining} of {NANO_WEEKLY_LIMIT} nano workouts left this week
            </p>
          </div>
        </div>
        <Link
          href="/workouts/nano"
          className="shrink-0 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          Start Nano
        </Link>
      </div>
    </div>
  );
}
