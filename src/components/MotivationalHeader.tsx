"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

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

export function MotivationalHeader({ hasStreak }: MotivationalHeaderProps) {
  const t = useTranslations('motivationalHeader');
  const timeOfDay = useTimeOfDay();

  const message = timeOfDay
    ? hasStreak
      ? t(`${timeOfDay}.withStreak`)
      : t(`${timeOfDay}.noStreak`)
    : t('default');

  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
      {message}
    </h2>
  );
}
