import Link from "next/link";

import { InstallPrompt } from "@/components/InstallPrompt";
import { LogoutButton } from "@/components/LogoutButton";
import { MotivationalHeader } from "@/components/MotivationalHeader";
import { NanoWorkoutCard } from "@/components/NanoWorkoutCard";
import { ShieldBanner } from "@/components/ShieldBanner";
import { StreakCard } from "@/components/StreakCard";
import {
  getAllWorkouts,
  getNextUncompletedWorkout,
  getTodayCompletions,
  getTodaySlug,
  getUserStreakStats,
} from "@/lib/workoutPlan";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default async function Home() {
  const [nextWorkout, allWorkouts, completions, streakStats] = await Promise.all([
    getNextUncompletedWorkout(),
    getAllWorkouts(),
    getTodayCompletions(),
    getUserStreakStats(),
  ]);
  const todaySlug = getTodaySlug();
  const hasStreak = (streakStats?.currentStreak ?? 0) >= 1;
  const hasCompletedToday = completions[todaySlug] ?? false;

  if (!nextWorkout || allWorkouts.length === 0) {
    throw new Error("Workout plan missing.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            Habits
          </p>
          <LogoutButton />
        </header>

        {/* Shield Banner (shows when shield was auto-applied) */}
        {hasStreak && <ShieldBanner currentStreak={streakStats?.currentStreak ?? 0} />}

        {/* Streak Display */}
        <StreakCard stats={streakStats} />

        {/* Nano Workout Option (shows when not completed today) */}
        <NanoWorkoutCard
          nanoRemaining={streakStats?.nanoRemaining ?? 0}
          hasCompletedToday={hasCompletedToday}
        />

        {/* Featured: Next uncompleted workout */}
        <section className="space-y-4">
          <MotivationalHeader hasStreak={hasStreak} />
          <Link
            href={`/workouts/${nextWorkout.slug}`}
            className="block rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 transition hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-400">
                  {nextWorkout.slug === todaySlug ? "Today" : "Up Next"} · {nextWorkout.label}
                </p>
                <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                  {nextWorkout.title}
                </h3>
                <p className="text-sm text-slate-300">
                  {nextWorkout.focus}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950">
                  View
                </span>
                <span className="text-xs text-slate-400">
                  {nextWorkout.segments.length} exercises · {formatDuration(nextWorkout.totalSeconds)}
                </span>
              </div>
            </div>
          </Link>
        </section>

        <InstallPrompt />

        {/* Weekly Schedule */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Weekly Schedule
          </h2>
          <div className="grid gap-3">
            {allWorkouts.map((workout) => {
              const isToday = workout.slug === todaySlug;
              const isCompleted = completions[workout.slug] ?? false;
              const isFeatured = workout.slug === nextWorkout.slug;

              return (
                <Link
                  key={workout.slug}
                  href={`/workouts/${workout.slug}`}
                  className={`flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition hover:bg-slate-800/50 ${
                    isFeatured
                      ? "border-emerald-500/50 bg-emerald-950/20"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Completion indicator */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isToday
                            ? "bg-slate-700 text-slate-300"
                            : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs font-medium">
                          {(workout.label ?? workout.slug).slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {workout.label ?? workout.slug}
                        </h3>
                        {isToday && !isCompleted && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">
                        {workout.title}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-300">
                      {formatDuration(workout.totalSeconds)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
