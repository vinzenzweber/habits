import { StreakStats } from "@/lib/workoutPlan";

interface StreakCardProps {
  stats: StreakStats | null;
}

/**
 * Small indicator badges for streak preservation options
 */
function PreservationBadges({ stats }: { stats: StreakStats }) {
  const { availableShields, nanoRemaining, restDayAvailable } = stats;

  // Don't show badges if no preservation options available
  if (availableShields === 0 && nanoRemaining === 0 && !restDayAvailable) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-700/50 pt-3">
      {availableShields > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
          <span role="img" aria-label="Shield">🛡️</span>
          {availableShields} shield{availableShields > 1 ? "s" : ""}
        </span>
      )}
      {nanoRemaining > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
          <span role="img" aria-label="Nano">⚡</span>
          {nanoRemaining} nano
        </span>
      )}
      {restDayAvailable && (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400">
          <span role="img" aria-label="Rest">😴</span>
          rest day
        </span>
      )}
    </div>
  );
}

export function StreakCard({ stats }: StreakCardProps) {
  // First time user - no completions yet
  if (!stats || stats.totalCompletions === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="Target">🎯</span>
          <div>
            <p className="font-medium text-slate-100">Start your streak today</p>
            <p className="text-sm text-slate-400">
              Complete your first workout to begin
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { currentStreak, longestStreak, daysSinceLastWorkout } = stats;

  // Active streak (2+ days)
  if (currentStreak >= 2) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="Fire streak">🔥</span>
            <div>
              <p className="text-lg font-semibold text-emerald-400">
                {currentStreak} Day Streak
              </p>
              <p className="text-sm text-slate-400">
                {currentStreak >= longestStreak
                  ? "You're at your best!"
                  : `Keep going! Longest: ${longestStreak}`}
              </p>
            </div>
          </div>
          {currentStreak >= longestStreak && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
              Personal Best
            </span>
          )}
        </div>
        <PreservationBadges stats={stats} />
      </div>
    );
  }

  // Streak of 1 (just started or at risk)
  if (currentStreak === 1) {
    const isAtRisk = daysSinceLastWorkout === 1;
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 to-slate-900/50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label={isAtRisk ? "Warning" : "Fire streak"}>
            {isAtRisk ? "⚡" : "🔥"}
          </span>
          <div>
            <p className="font-medium text-amber-400">
              {isAtRisk ? "Don't break your streak!" : "1 Day Streak"}
            </p>
            <p className="text-sm text-slate-400">
              {isAtRisk
                ? "Complete today's workout to keep it alive"
                : longestStreak > 1
                  ? `Building momentum! Longest: ${longestStreak}`
                  : "Great start - keep the momentum going"}
            </p>
          </div>
        </div>
        <PreservationBadges stats={stats} />
      </div>
    );
  }

  // No active streak but has history
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label="Strength">💪</span>
        <div>
          <p className="font-medium text-slate-100">Start a new streak</p>
          <p className="text-sm text-slate-400">
            {longestStreak > 0
              ? `Your best: ${longestStreak} days. Time to beat it!`
              : "Complete today's workout to begin"}
          </p>
        </div>
      </div>
      <PreservationBadges stats={stats} />
    </div>
  );
}
