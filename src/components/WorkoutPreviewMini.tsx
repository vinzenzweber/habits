"use client";

import { useSyncExternalStore } from "react";

// Self-contained workout data to avoid importing server-side dependencies
const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type DaySlug = (typeof DAY_ORDER)[number];

const DAY_LABELS: Record<DaySlug, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Default workout preview data (title, focus, approx duration)
const DEFAULT_WORKOUTS: Record<DaySlug, { title: string; focus: string; duration: string }> = {
  monday: { title: "Push (Moderate)", focus: "Upper body push movements", duration: "25 min" },
  tuesday: { title: "Pull (Moderate)", focus: "Upper body pull movements", duration: "25 min" },
  wednesday: { title: "Lower (Moderate)", focus: "Legs and posterior chain", duration: "25 min" },
  thursday: { title: "HIIT Circuit", focus: "High intensity intervals", duration: "20 min" },
  friday: { title: "Full Body Flow", focus: "Compound movements", duration: "30 min" },
  saturday: { title: "Active Recovery", focus: "Mobility and light work", duration: "20 min" },
  sunday: { title: "Rest & Restore", focus: "Gentle movement", duration: "15 min" },
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

  // Show loading skeleton during SSR to avoid hydration mismatch
  if (!todaySlug) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
          Today&apos;s Workout
        </p>
        <div className="h-5 w-32 animate-pulse rounded bg-slate-700" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-700" />
      </div>
    );
  }

  const workout = DEFAULT_WORKOUTS[todaySlug];
  const dayLabel = DAY_LABELS[todaySlug];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
        Today&apos;s Workout
      </p>
      <p className="font-medium text-slate-100">{dayLabel}: {workout.title}</p>
      <p className="mt-1 text-sm text-slate-400">
        {workout.focus} · {workout.duration}
      </p>
    </div>
  );
}
