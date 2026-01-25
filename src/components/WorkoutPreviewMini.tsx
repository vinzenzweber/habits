"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// Self-contained workout data to avoid importing server-side dependencies
const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type DaySlug = (typeof DAY_ORDER)[number];

// Default workout preview data (duration only - titles/focus use translation keys)
const DEFAULT_WORKOUTS: Record<DaySlug, { titleKey: string; focusKey: string; duration: string }> = {
  monday: { titleKey: "monday.title", focusKey: "monday.focus", duration: "25 min" },
  tuesday: { titleKey: "tuesday.title", focusKey: "tuesday.focus", duration: "25 min" },
  wednesday: { titleKey: "wednesday.title", focusKey: "wednesday.focus", duration: "25 min" },
  thursday: { titleKey: "thursday.title", focusKey: "thursday.focus", duration: "20 min" },
  friday: { titleKey: "friday.title", focusKey: "friday.focus", duration: "30 min" },
  saturday: { titleKey: "saturday.title", focusKey: "saturday.focus", duration: "20 min" },
  sunday: { titleKey: "sunday.title", focusKey: "sunday.focus", duration: "15 min" },
};

function getTodaySlug(): DaySlug {
  return DAY_ORDER[new Date().getDay()];
}

// Empty subscribe function - the date only needs to be read once on mount
function subscribe() {
  return () => {};
}

// useSyncExternalStore hook to safely get today's slug on client only
function useTodaySlug(): DaySlug | null {
  return useSyncExternalStore(
    subscribe,
    getTodaySlug, // Client: return actual value
    () => null // Server: return null to show loading state
  );
}

export function WorkoutPreviewMini() {
  const todaySlug = useTodaySlug();
  const t = useTranslations("workout");
  const tCommon = useTranslations("common");
  const tDefaultWorkouts = useTranslations("defaultWorkouts");

  // Show loading skeleton during SSR to avoid hydration mismatch
  if (!todaySlug) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
          {t("todaysWorkout")}
        </p>
        <div className="h-5 w-32 animate-pulse rounded bg-slate-700" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-700" />
      </div>
    );
  }

  const workout = DEFAULT_WORKOUTS[todaySlug];
  const dayLabel = tCommon(`days.${todaySlug}`);
  const workoutTitle = tDefaultWorkouts(workout.titleKey);
  const workoutFocus = tDefaultWorkouts(workout.focusKey);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
        {t("todaysWorkout")}
      </p>
      <p className="font-medium text-slate-100">{dayLabel}: {workoutTitle}</p>
      <p className="mt-1 text-sm text-slate-400">
        {workoutFocus} · {workout.duration}
      </p>
    </div>
  );
}
