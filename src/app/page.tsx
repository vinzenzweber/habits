import Image from "next/image";
import Link from "next/link";

import { InstallPrompt } from "@/components/InstallPrompt";
import {
  getWorkoutForToday,
  getWorkoutsWithAssignments,
  type WorkoutWithMedia,
} from "@/lib/workouts";

const CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export const dynamic = "force-dynamic";

type WorkoutSectionProps = {
  id: string;
  title: string;
  description: string;
  workouts: WorkoutWithMedia[];
  emptyLabel: string;
  highlightSlug?: WorkoutWithMedia["slug"];
};

function WorkoutSection({
  id,
  title,
  description,
  workouts,
  emptyLabel,
  highlightSlug,
}: WorkoutSectionProps) {
  return (
    <section
      id={id}
      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
      aria-label={`${title} list`}
    >
      <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
      {workouts.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-400">{emptyLabel}</div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {workouts.map((workout) => (
            <li key={workout.slug}>
              <Link
                href={`/workouts/${workout.slug}`}
                className="group flex flex-col gap-3 px-5 py-6 transition hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  {workout.thumbnailUrl ? (
                    <div className="relative h-24 w-full flex-shrink-0 overflow-hidden rounded-2xl border border-slate-800 sm:h-28 sm:w-44">
                      <Image
                        src={workout.thumbnailUrl}
                        alt={`Thumbnail for ${workout.label}`}
                        fill
                        className="object-cover"
                        sizes="(min-width: 640px) 176px, 100vw"
                        priority={highlightSlug === workout.slug}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {workout.label}
                    </span>
                    <h2 className="text-xl font-semibold text-white">
                      {workout.title}
                    </h2>
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-300">
                      {workout.videoUrl
                        ? workout.originalFilename ?? "Video assigned"
                        : "Video not assigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <span className="uppercase tracking-wider">View</span>
                  <span
                    aria-hidden
                    className="text-lg transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Home() {
  const [todayWorkout, workouts] = await Promise.all([
    getWorkoutForToday(),
    getWorkoutsWithAssignments(),
  ]);

  const workoutsWithVideo = workouts.filter((workout) => Boolean(workout.videoUrl));
  const workoutsWithoutVideo = workouts.filter((workout) => !workout.videoUrl);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        <header className="flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            Habits
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Your daily routine.
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Use the media manager to add videos for each day of the week. Once
              assigned, you can launch the current day&apos;s session instantly or pick
              any day below.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/today"
              className={`${CTA_CLASSES} bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300`}
            >
              Today
            </Link>
            <Link
              href="#workouts"
              className={`${CTA_CLASSES} border border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300 hover:text-emerald-100`}
            >
              Workouts
            </Link>
            <Link
              href="#videos"
              className={`${CTA_CLASSES} border border-slate-700 bg-slate-900/60 text-slate-100 hover:border-emerald-400/60 hover:text-emerald-300`}
            >
              Videos
            </Link>
            <Link
              href="/admin"
              className={`${CTA_CLASSES} border border-slate-700 bg-slate-900/60 text-slate-100 hover:border-emerald-400/60 hover:text-emerald-300`}
            >
              Media manager
            </Link>
          </div>
        </header>

        <InstallPrompt />

        <WorkoutSection
          id="workouts"
          title="Workouts"
          description="Guided routines without assigned videos."
          emptyLabel="All workouts currently have a video assigned."
          workouts={workoutsWithoutVideo}
          highlightSlug={todayWorkout?.slug}
        />

        <WorkoutSection
          id="videos"
          title="Videos"
          description="Sessions with uploaded videos attached."
          emptyLabel="No video workouts yet — add one in the media manager."
          workouts={workoutsWithVideo}
          highlightSlug={todayWorkout?.slug}
        />

        <footer className="pt-2 text-xs text-slate-500">
          <p>
            Tip: Upload videos on desktop, then open Habits on your phone for
            full-screen playback each morning.
          </p>
        </footer>
      </div>
    </main>
  );
}
