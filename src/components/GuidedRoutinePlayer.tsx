"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import type {
  RoutineSegment,
  RoutineSegmentCategory,
  StructuredWorkout,
} from "@/lib/workoutPlan";
import type { WorkoutWithMedia } from "@/lib/workouts";

type GuidedRoutinePlayerProps = {
  workout: WorkoutWithMedia;
  onSelectVideo?: () => void;
};

type CategoryStyles = {
  badge: string;
  bar: string;
};

const CATEGORY_STYLES: Record<RoutineSegmentCategory, CategoryStyles> = {
  prep: { badge: "bg-sky-500/20 text-sky-200", bar: "bg-sky-400" },
  warmup: { badge: "bg-amber-500/20 text-amber-200", bar: "bg-amber-400" },
  main: { badge: "bg-emerald-500/20 text-emerald-200", bar: "bg-emerald-400" },
  hiit: { badge: "bg-rose-500/20 text-rose-200", bar: "bg-rose-400" },
  recovery: { badge: "bg-cyan-500/20 text-cyan-200", bar: "bg-cyan-400" },
  rest: { badge: "bg-slate-500/20 text-slate-200", bar: "bg-slate-200" },
};

const BEEP_TRIGGER_SECONDS = 4;

function formatTime(seconds: number) {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = clamped % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function sumDuration(segments: RoutineSegment[], endIndex: number) {
  return segments.slice(0, endIndex).reduce((total, segment) => {
    return total + segment.durationSeconds;
  }, 0);
}

export function GuidedRoutinePlayer({
  workout,
  onSelectVideo,
}: GuidedRoutinePlayerProps) {
  const routine: StructuredWorkout | null = workout.routine ?? null;
  const segments = useMemo(
    () => routine?.segments ?? [],
    [routine],
  );
  const totalSeconds = useMemo(
    () => routine?.totalSeconds ?? 0,
    [routine],
  );
  const routineTitle = routine?.title ?? workout.title;
  const routineFocus = routine?.focus ?? workout.focus ?? workout.description ?? "";
  const routineDescription = routine?.description ?? workout.description ?? "";
  const hasRoutine = segments.length > 0;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    segments[0]?.durationSeconds ?? 0,
  );
  const [isRunning, setIsRunning] = useState(true);
  const [hasFinished, setHasFinished] = useState(false);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const segmentBeepPlayedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio("/short-beep-countdown-81121.mp3");
    audio.preload = "auto";
    countdownAudioRef.current = audio;
  }, []);

  useEffect(() => {
    if (!hasRoutine || !isRunning || hasFinished) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 0.25) {
          setCurrentIndex((index) => {
            if (index >= segments.length - 1) {
              setHasFinished(true);
              setIsRunning(false);
              segmentBeepPlayedRef.current = false;
              return index;
            }
            const nextIndex = index + 1;
            const nextDuration = segments[nextIndex]?.durationSeconds ?? 0;
            setRemainingSeconds(nextDuration);
            segmentBeepPlayedRef.current = false;
            return nextIndex;
          });
          return 0;
        }
        return Math.max(0, previous - 0.25);
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [hasFinished, hasRoutine, isRunning, segments]);

  useEffect(() => {
    const audio = countdownAudioRef.current;
    if (!audio) {
      return;
    }

    if (!hasRoutine || hasFinished) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    if (!isRunning) {
      audio.pause();
      return;
    }

    const roundedRemaining = Math.ceil(remainingSeconds);

    if (roundedRemaining > BEEP_TRIGGER_SECONDS || roundedRemaining <= 0) {
      segmentBeepPlayedRef.current = false;
      return;
    }

    if (!segmentBeepPlayedRef.current && roundedRemaining === BEEP_TRIGGER_SECONDS) {
      segmentBeepPlayedRef.current = true;
      audio.currentTime = 0;
      void audio.play();
    }
  }, [hasFinished, hasRoutine, isRunning, remainingSeconds]);

  const currentSegment = segments[currentIndex];
  const nextSegment = segments[currentIndex + 1];

  const elapsedSeconds = useMemo(() => {
    const completedBefore = sumDuration(segments, currentIndex);
    const currentDuration = currentSegment?.durationSeconds ?? 0;
    const elapsedInsideCurrent = Math.max(
      0,
      currentDuration - remainingSeconds,
    );
    return Math.min(
      totalSeconds,
      completedBefore + elapsedInsideCurrent,
    );
  }, [currentIndex, currentSegment?.durationSeconds, remainingSeconds, segments, totalSeconds]);

  const overallProgress =
    totalSeconds > 0
      ? Math.min(100, (elapsedSeconds / totalSeconds) * 100)
      : 0;
  const currentProgress = currentSegment
    ? Math.min(
        100,
        ((currentSegment.durationSeconds - remainingSeconds) /
          currentSegment.durationSeconds) *
          100,
          )
        : 0;
  const totalRemaining = Math.max(0, totalSeconds - elapsedSeconds);

  const currentStyles =
    CATEGORY_STYLES[currentSegment?.category ?? "main"] ??
    CATEGORY_STYLES.main;
  const nextStyles =
    CATEGORY_STYLES[nextSegment?.category ?? "rest"] ?? CATEGORY_STYLES.rest;

  const handleToggle = () => {
    if (hasFinished) {
      setCurrentIndex(0);
      setRemainingSeconds(segments[0]?.durationSeconds ?? 0);
      setHasFinished(false);
      segmentBeepPlayedRef.current = false;
      setIsRunning(true);
      return;
    }
    setIsRunning((previous) => !previous);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setRemainingSeconds(segments[0]?.durationSeconds ?? 0);
    setHasFinished(false);
    segmentBeepPlayedRef.current = false;
    setIsRunning(true);
  };

  const content = hasRoutine ? (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-slate-950 via-slate-950/90 to-transparent" />
      <header className="relative z-20 flex items-center justify-between gap-3 px-5 pt-6">
        <Link
          href="/"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
        >
          Home
        </Link>
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200">
          {workout.label} · Guided Timer
        </div>
        {onSelectVideo ? (
          <button
            type="button"
            onClick={onSelectVideo}
            className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
          >
            Video
          </button>
        ) : (
          <div className="w-[88px]" aria-hidden />
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 pb-12 pt-4 sm:px-8">
        <div className="space-y-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300">
            <span>Overall progress</span>
            <span>{formatTime(totalRemaining)} left</span>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 shadow-2xl shadow-emerald-500/10 sm:px-8">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${currentStyles.badge}`}>
              {currentSegment?.category ?? "Segment"}
            </span>
            {currentSegment?.round ? (
              <span className="text-[11px] text-slate-300">
                {currentSegment.round}
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {hasFinished ? "Workout complete" : currentSegment?.title}
            </h1>
            <p className="text-sm text-slate-200 sm:text-base">
              {hasFinished
                ? "Nice work. Recover, hydrate, and come back tomorrow."
                : currentSegment?.detail ?? routineDescription}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-mono font-semibold sm:text-6xl">
                {formatTime(hasFinished ? 0 : remainingSeconds)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleToggle}
                className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-emerald-300"
              >
                {hasFinished ? "Replay" : isRunning ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
              >
                Restart
              </button>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${currentStyles.bar} transition-[width]`}
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-3 sm:p-6">
            <div className="mt-2 rounded-2xl border border-white/5 bg-white/5 p-4">
              {nextSegment ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.25em] ${nextStyles.badge}`}
                    >
                      Next
                    </span>
                    {nextSegment.round ? (
                      <span className="text-xs text-slate-300">
                        {nextSegment.round}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {nextSegment.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {nextSegment.detail ?? routineDescription}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-emerald-200">
                    {formatTime(nextSegment.durationSeconds)} on deck
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-emerald-200">
                  Final stretch done — breathe easy.
                </p>
              )}
            </div>
          <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              Session info
            </p>
            <p className="text-sm text-slate-200">{routineTitle}</p>
            <p className="text-sm text-slate-400">{routineFocus}</p>
            <p className="text-sm text-slate-400">
              Total: {formatTime(totalSeconds)}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Timeline
            </p>
            <p className="text-xs text-slate-400">
              Auto-started · {segments.length} steps
            </p>
          </div>
          <div className="grid gap-2">
            {segments.map((segment, index) => {
              const progressWithinSegment =
                index === currentIndex && !hasFinished
                  ? currentProgress
                  : index < currentIndex
                    ? 100
                    : 0;
              const styles =
                CATEGORY_STYLES[segment.category] ?? CATEGORY_STYLES.main;
              return (
                <div
                  key={segment.id}
                  className={`rounded-2xl border border-white/5 bg-white/5 px-4 py-3 transition ${
                    index === currentIndex
                      ? "border-emerald-300/50 shadow-lg shadow-emerald-500/10"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 ${styles.badge}`}
                        >
                          {segment.category}
                        </span>
                        {segment.round ? (
                          <span className="text-[11px] text-slate-400">
                            {segment.round}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-base font-semibold text-white">
                        {segment.title}
                      </p>
                      {segment.detail ? (
                        <p className="text-xs text-slate-400">{segment.detail}</p>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold text-emerald-200">
                      {formatTime(segment.durationSeconds)}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full ${styles.bar}`}
                      style={{ width: `${progressWithinSegment}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  ) : (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <p className="text-lg font-semibold">
        No guided plan available for this day.
      </p>
      <p className="mt-2 text-sm text-slate-300">
        Add a routine in code or switch to the video player if available.
      </p>
      {onSelectVideo ? (
        <button
          type="button"
          onClick={onSelectVideo}
          className="mt-4 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Switch to video
        </button>
      ) : null}
    </div>
  );

  return content;
}
