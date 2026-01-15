import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NANO_WORKOUT, NANO_WEEKLY_LIMIT } from "@/lib/nanoWorkout";
import { canDoNanoWorkout } from "@/lib/streakShields";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export const metadata: Metadata = {
  title: "Nano Workout | Habits",
  description: "A quick 3-minute workout to save your streak on tough days.",
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default async function NanoWorkoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id, 10);
  const canDo = await canDoNanoWorkout(userId);

  if (!canDo) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
          <header className="flex flex-col gap-6">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
            >
              ← Back
            </Link>
            <div className="space-y-4 text-center">
              <span className="text-4xl" role="img" aria-label="Lightning">
                ⚡
              </span>
              <h1 className="text-2xl font-semibold text-white">
                Nano Limit Reached
              </h1>
              <p className="text-slate-400">
                You&apos;ve used all {NANO_WEEKLY_LIMIT} nano workouts this week.
                <br />
                Complete a full workout to keep your streak going!
              </p>
              <Link
                href="/"
                className={`${CTA_CLASSES} bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300`}
              >
                Back to Home
              </Link>
            </div>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        <header className="flex flex-col gap-6">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
          >
            ← Back
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-400">
                  Streak Saver
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                  {NANO_WORKOUT.title}
                </h1>
              </div>
              <p className="text-sm text-slate-300 sm:text-base">
                {NANO_WORKOUT.focus}
              </p>
            </div>
            <Link
              href="/workouts/nano/play"
              className={`${CTA_CLASSES} bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-400`}
            >
              Start
            </Link>
          </div>
          <p className="text-sm text-slate-300 sm:text-base">
            {NANO_WORKOUT.description}
          </p>
        </header>

        <section
          className="overflow-hidden rounded-3xl border border-purple-500/30 bg-purple-950/20 backdrop-blur"
          aria-label="Nano workout plan"
        >
          <div className="border-b border-purple-500/30 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Quick Routine</h2>
            <p className="mt-1 text-sm text-slate-300">
              {NANO_WORKOUT.segments.filter(s => s.category === "main").length} exercises · {formatDuration(NANO_WORKOUT.totalSeconds)} total
            </p>
          </div>
          <ol className="divide-y divide-purple-500/20">
            {NANO_WORKOUT.segments.map((segment, index) => (
              <li
                key={segment.id}
                className="flex gap-4 px-5 py-4 sm:px-6"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white">
                      {index + 1}. {segment.title}
                    </h3>
                    <span className="text-sm font-semibold text-purple-300">
                      {formatDuration(segment.durationSeconds)}
                    </span>
                  </div>
                  {segment.detail && (
                    <p className="text-base text-slate-300 sm:text-lg">{segment.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
