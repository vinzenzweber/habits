import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getWorkoutBySlug, getTodayCompletions, getTodaySlug } from "@/lib/workoutPlan";
import { PageContextSetter } from "@/components/PageContextSetter";
import { ExerciseImages } from "@/components/ExerciseImages";

export const dynamic = "force-dynamic";

const CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

type WorkoutPageProps = {
  params: {
    slug: string;
  };
};

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

export async function generateMetadata({ params }: WorkoutPageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const workout = await getWorkoutBySlug(slug);

  if (!workout) {
    return {
      title: "Workout not found — Habits",
    };
  }

  return {
    title: `${workout.label} | Habits`,
    description: `${workout.title} — ${workout.description}`.trim(),
  };
}

export default async function WorkoutDetailPage({ params }: WorkoutPageProps) {
  const { slug } = await Promise.resolve(params);
  const workout = await getWorkoutBySlug(slug ?? "");

  if (!workout) {
    notFound();
  }

  const completions = await getTodayCompletions();
  const todaySlug = getTodaySlug();
  const isToday = slug === todaySlug;
  const isCompleted = completions[workout.slug] ?? false;
  const groupedSegments = groupSegments(workout.segments);

  return (
    <>
      <PageContextSetter
        page="workout"
        workoutSlug={workout.slug}
        workoutTitle={`${workout.label} - ${workout.title}`}
      />
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
          <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
            >
              ← Back
            </Link>
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Completed today
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  {isToday ? "Today · " : ""}Your {workout.label} Workout
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
              href={`/workouts/${workout.slug}/play`}
              className={`${CTA_CLASSES} bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300`}
            >
              {isCompleted ? "Play Again" : "Start"}
            </Link>
          </div>
          <p className="text-sm text-slate-300 sm:text-base">
            {workout.description}
          </p>
        </header>

        <section
          className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
          aria-label="Workout plan"
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
                  {group.items.map((segment, index) => {
                    const showImage = segment.category !== 'prep' && segment.category !== 'rest';
                    return (
                      <li
                        key={segment.id}
                        className="flex gap-4 px-5 py-4 sm:px-6"
                      >
                        {/* Exercise image - left aligned */}
                        {showImage && (
                          <ExerciseImages
                            exerciseName={segment.title}
                            size="md"
                            className="hidden sm:block"
                          />
                        )}
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-lg font-semibold text-white">
                              {group.startIndex + index + 1}. {segment.title}
                            </h3>
                            <span className="text-sm font-semibold text-emerald-200">
                              {formatDuration(segment.durationSeconds)}
                            </span>
                          </div>
                          {segment.detail ? (
                            <p className="text-base text-slate-300 sm:text-lg">
                              {segment.detail}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </section>
        </div>
      </main>
    </>
  );
}
