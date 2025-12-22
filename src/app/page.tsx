import Link from "next/link";

import { InstallPrompt } from "@/components/InstallPrompt";
import { getWorkoutForToday } from "@/lib/workoutPlan";

const CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function groupSegments<T extends { category: string }>(segments: T[]) {
  const groups: Array<{
    category: string;
    items: T[];
    startIndex: number;
  }> = [];
  let indexOffset = 0;

  for (const segment of segments) {
    const last = groups[groups.length - 1];
    if (!last || last.category !== segment.category) {
      groups.push({
        category: segment.category,
        items: [segment],
        startIndex: indexOffset,
      });
    } else {
      last.items.push(segment);
    }
    indexOffset += 1;
  }

  return groups;
}

export default async function Home() {
  const workout = getWorkoutForToday();
  if (!workout) {
    throw new Error("Workout plan missing.");
  }

  const groupedSegments = groupSegments(workout.segments);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
                Habits
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Today · {workout.label}
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                  {workout.title}
                </h1>
              </div>
              <p className="text-sm text-slate-300 sm:text-base">
                {workout.focus}
              </p>
            </div>
            <Link
              href={`/workouts/${workout.slug}`}
              className={`${CTA_CLASSES} bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300`}
            >
              Start
            </Link>
          </div>
          <p className="text-sm text-slate-300 sm:text-base">
            {workout.description}
          </p>
        </header>

        <InstallPrompt />

        <section
          className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
          aria-label="Today workout plan"
        >
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Workout plan</h2>
            <p className="mt-1 text-sm text-slate-300">
              {workout.segments.length} exercises · {formatDuration(workout.totalSeconds)} total
            </p>
          </div>
          <div className="divide-y divide-slate-800">
            {groupedSegments.map((group, groupIndex) => (
              <section key={`${group.category}-${groupIndex}`}>
                <div className="px-5 pb-2 pt-5 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                    {group.category.toUpperCase()}
                  </p>
                </div>
                <ol className="divide-y divide-slate-800">
                  {group.items.map((segment, index) => (
                    <li
                      key={segment.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:px-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {group.startIndex + index + 1}. {segment.title}
                          </h3>
                        </div>
                        <span className="text-sm font-semibold text-emerald-200">
                          {formatDuration(segment.durationSeconds)}
                        </span>
                      </div>
                      {segment.detail ? (
                        <p className="text-sm text-slate-300">
                          {segment.detail}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
