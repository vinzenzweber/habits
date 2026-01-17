"use client";

import { useSyncExternalStore } from "react";

interface MotivationalHeaderProps {
  hasStreak: boolean;
}

type TimeOfDay = "morning" | "midday" | "afternoon" | "evening";

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  return "evening";
}

const MESSAGES = {
  morning: {
    withStreak: "Morning momentum builds champions",
    noStreak: "Start your day strong",
  },
  midday: {
    withStreak: "Midday power-up awaits",
    noStreak: "Perfect time for a workout",
  },
  afternoon: {
    withStreak: "Afternoon energy boost ready",
    noStreak: "Beat the evening slump",
  },
  evening: {
    withStreak: "End your day accomplished",
    noStreak: "There's still time today",
  },
};

// Empty subscribe function - time of day only needs to be read once on mount
function subscribe() {
  return () => {};
}

// useSyncExternalStore hook to safely get time of day on client only
function useTimeOfDay(): TimeOfDay | null {
  return useSyncExternalStore(
    subscribe,
    getTimeOfDay, // Client: return actual value
    () => null // Server: return null to show default message
  );
}

// Default message to show during SSR (neutral greeting)
const DEFAULT_MESSAGE = "Your workout awaits";

export function MotivationalHeader({ hasStreak }: MotivationalHeaderProps) {
  const timeOfDay = useTimeOfDay();

  const message = timeOfDay
    ? hasStreak
      ? MESSAGES[timeOfDay].withStreak
      : MESSAGES[timeOfDay].noStreak
    : DEFAULT_MESSAGE;

  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
      {message}
    </h2>
  );
}
