"use client";

interface MotivationalHeaderProps {
  hasStreak: boolean;
}

function getTimeOfDay(): "morning" | "midday" | "afternoon" | "evening" {
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

export function MotivationalHeader({ hasStreak }: MotivationalHeaderProps) {
  const timeOfDay = getTimeOfDay();
  const message = hasStreak
    ? MESSAGES[timeOfDay].withStreak
    : MESSAGES[timeOfDay].noStreak;

  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
      {message}
    </h2>
  );
}
