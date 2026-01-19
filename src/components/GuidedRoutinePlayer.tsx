"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useChat } from "@/contexts/ChatContext";
import { useFullscreen } from "@/lib/fullscreen";
import { Confetti } from "./Confetti";
import { ExerciseImages, ExerciseImageThumbnail, normalizeForUrl } from "./ExerciseImages";

import type {
  RoutineSegment,
  RoutineSegmentCategory,
  WorkoutDay,
} from "@/lib/workoutPlan";
import type { NanoWorkout } from "@/lib/nanoWorkout";

// Base workout type that both regular and nano workouts satisfy
type PlayableWorkout = WorkoutDay | (NanoWorkout & { label?: string });

// Expand icon (enter fullscreen) - arrows pointing outward
const ExpandIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
    />
  </svg>
);

// Collapse icon (exit fullscreen) - arrows pointing inward
const CollapseIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 9V4m0 5H4m0 0l5-5m11 5h-5m5 0V4m0 0l-5 5M9 15v5m0-5H4m0 0l5 5m11-5h-5m5 0v5m0 0l-5-5"
    />
  </svg>
);

type GuidedRoutinePlayerProps = {
  workout: PlayableWorkout;
  isNano?: boolean;
  availableImages?: Set<string>; // Normalized names of exercises with complete images
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

// Countdown beeps play at these seconds remaining before each segment ends
const COUNTDOWN_SECONDS = [4, 3, 2, 1];

// Threshold in pixels from left edge to detect swipe-back gesture
const SWIPE_EDGE_THRESHOLD_PX = 30;

// Style to prevent horizontal overscroll navigation
const PREVENT_OVERSCROLL_STYLE = { overscrollBehaviorX: 'none' as const };

// Message sent to AI after workout completion
const WORKOUT_COMPLETION_MESSAGE = (title: string) =>
  `I just completed the ${title} workout! Congratulate me briefly and ask how the difficulty felt. After I respond, you may suggest modifications if appropriate but do NOT automatically apply any changes.`;

// Message for nano workout completion
const NANO_COMPLETION_MESSAGE = () =>
  `I just completed a nano workout to save my streak! Give me a brief but enthusiastic congratulation for showing up even on a tough day.`;

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
  isNano = false,
  availableImages,
}: GuidedRoutinePlayerProps) {
  const { openChat } = useChat();

  // Helper to check if an exercise has images available
  const hasImages = useCallback((exerciseName: string) => {
    // If availableImages is not provided, default to true (backward compatible)
    if (!availableImages) return true;
    return availableImages.has(normalizeForUrl(exerciseName));
  }, [availableImages]);
  const segments = useMemo(() => workout.segments ?? [], [workout.segments]);
  const totalSeconds = useMemo(() => workout.totalSeconds ?? 0, [workout.totalSeconds]);
  const routineTitle = workout.title;
  const routineFocus = workout.focus;
  const routineDescription = workout.description;
  const hasRoutine = segments.length > 0;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    segments[0]?.durationSeconds ?? 0,
  );
  const [isRunning, setIsRunning] = useState(true);
  const [hasFinished, setHasFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionId, setCompletionId] = useState<number | null>(null);
  const [isTrackingCompletion, setIsTrackingCompletion] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  // Track which countdown seconds have been played for the current segment
  const countdownBeepsPlayedRef = useRef<Set<number>>(new Set());
  const startTimeRef = useRef<number>(0);
  const hasTrackedCompletionRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef);

  // Play beep sound using Web Audio API (doesn't interrupt background music)
  const playBeep = useCallback(() => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;

    if (!audioContext || !audioBuffer) return;

    // Resume AudioContext if suspended (required after user gesture on iOS)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create a new buffer source for each play (they're one-time use)
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  }, []);

  useEffect(() => {
    // Create AudioContext on mount (with webkit prefix fallback for older Safari)
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    // Load and decode the beep sound
    fetch("/short-beep-countdown-81121.mp3")
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        audioBufferRef.current = audioBuffer;
      })
      .catch(error => {
        console.error("Failed to load countdown beep:", error);
      });

    // Cleanup on unmount
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  // Track workout completion and trigger confetti
  useEffect(() => {
    if (hasFinished && workout.slug && !hasTrackedCompletionRef.current) {
      hasTrackedCompletionRef.current = true;
      const actualDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // Use async function to properly sequence state updates
      const trackCompletion = async () => {
        setIsTrackingCompletion(true);
        try {
          // Use different endpoint for nano workouts
          const endpoint = isNano
            ? "/api/workouts/nano/complete"
            : `/api/workouts/${workout.slug}/complete`;

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ durationSeconds: actualDuration })
          });
          if (!res.ok) {
            throw new Error('Failed to save workout completion');
          }
          const data = await res.json();
          if (data.completionId) {
            setCompletionId(data.completionId);
          }
          // Trigger confetti animation
          setShowConfetti(true);
        } catch (error) {
          console.error('Completion tracking error:', error);
          // Still show confetti even if tracking failed
          setShowConfetti(true);
        } finally {
          setIsTrackingCompletion(false);
        }
      };

      trackCompletion();
    }
  }, [hasFinished, workout.slug, isNano]);

  // Handle confetti completion - open chat modal
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
    openChat({
      initialMessage: isNano
        ? NANO_COMPLETION_MESSAGE()
        : WORKOUT_COMPLETION_MESSAGE(workout.title),
      autoSend: true,
      completionId: completionId ?? undefined
    });
  }, [openChat, workout.title, completionId, isNano]);

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
              countdownBeepsPlayedRef.current.clear();
              return index;
            }
            const nextIndex = index + 1;
            const nextDuration = segments[nextIndex]?.durationSeconds ?? 0;
            setRemainingSeconds(nextDuration);
            countdownBeepsPlayedRef.current.clear();
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
    if (!hasRoutine || hasFinished || !isRunning) {
      return;
    }

    const roundedRemaining = Math.ceil(remainingSeconds);

    // Reset tracking when not in countdown zone
    if (roundedRemaining > 4) {
      countdownBeepsPlayedRef.current.clear();
      return;
    }

    // Play beep for each second in countdown (4, 3, 2, 1)
    if (
      COUNTDOWN_SECONDS.includes(roundedRemaining) &&
      !countdownBeepsPlayedRef.current.has(roundedRemaining)
    ) {
      countdownBeepsPlayedRef.current.add(roundedRemaining);
      playBeep();
    }
  }, [hasFinished, hasRoutine, isRunning, remainingSeconds, playBeep]);

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

  const groupedSegments = useMemo(() => {
    const groups: Array<{
      category: RoutineSegmentCategory;
      items: Array<{ segment: RoutineSegment; index: number }>;
    }> = [];

    segments.forEach((segment, index) => {
      const last = groups[groups.length - 1];
      if (!last || last.category !== segment.category) {
        groups.push({ category: segment.category, items: [{ segment, index }] });
        return;
      }
      last.items.push({ segment, index });
    });

    return groups;
  }, [segments]);

  const handleToggle = () => {
    if (hasFinished) {
      setCurrentIndex(0);
      setRemainingSeconds(segments[0]?.durationSeconds ?? 0);
      setHasFinished(false);
      countdownBeepsPlayedRef.current.clear();
      setIsRunning(true);
      return;
    }
    setIsRunning((previous) => !previous);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setRemainingSeconds(segments[0]?.durationSeconds ?? 0);
    setHasFinished(false);
    setShowConfetti(false);
    setCompletionId(null);
    countdownBeepsPlayedRef.current.clear();
    hasTrackedCompletionRef.current = false;
    startTimeRef.current = Date.now();
    setIsRunning(true);
  };

  // Track touch start position to detect horizontal swipes from edge
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Prevent swipe-back navigation on touch devices
  // Only blocks horizontal swipes starting from the left edge, allowing vertical scrolling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch && touch.clientX < SWIPE_EDGE_THRESHOLD_PX) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      touchStartRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only prevent if moving horizontally (swipe-back gesture)
    // Allow vertical scrolling by checking if horizontal movement dominates
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
      e.preventDefault();
    }
  }, []);

  const content = hasRoutine ? (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white touch-pan-y"
      style={PREVENT_OVERSCROLL_STYLE}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-slate-950 via-slate-950/90 to-transparent" />
      <header className="relative z-20 flex items-center justify-between gap-3 px-5 pt-6">
        <Link
          href={`/workouts/${workout.slug}`}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
        >
          ← Back
        </Link>
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200">
          {workout.label} · Guided Timer
        </div>
        {isSupported ? (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="rounded-full border border-white/20 p-2 text-white transition hover:border-emerald-300 hover:text-emerald-200"
          >
            {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
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
          <div className="mt-4 flex gap-4">
            {/* Exercise image for current segment */}
            {!hasFinished && currentSegment && currentSegment.category !== 'prep' && currentSegment.category !== 'rest' && (
              <ExerciseImages
                exerciseName={currentSegment.title}
                size="lg"
                hasImages={hasImages(currentSegment.title)}
              />
            )}
            <div className="flex-1 space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {hasFinished ? "Workout complete" : currentSegment?.title}
              </h1>
              {!hasFinished && currentSegment?.detail ? (
                <p className="text-xl text-slate-200 sm:text-2xl">
                  {currentSegment.detail}
                </p>
              ) : null}
            </div>
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
                disabled={isTrackingCompletion}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-300 hover:text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Timeline
            </p>
            <p className="text-xs text-slate-400">
              Auto-started · {segments.length} steps
            </p>
          </div>
          <div className="grid gap-4">
            {groupedSegments.map((group, groupIndex) => {
              const groupStyles =
                CATEGORY_STYLES[group.category] ?? CATEGORY_STYLES.main;

              return (
                <section key={`${group.category}-${groupIndex}`}>
                  <div className="px-1 pb-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${groupStyles.badge}`}
                    >
                      {group.category.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {group.items.map(({ segment, index }) => {
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
                          <div className="flex items-center gap-3">
                            {/* Timeline thumbnail */}
                            {segment.category !== 'prep' && segment.category !== 'rest' && (
                              <ExerciseImageThumbnail
                                exerciseName={segment.title}
                                hasImages={hasImages(segment.title)}
                              />
                            )}
                            <div className="flex flex-1 items-center justify-between gap-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300">
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
        Add a routine in the workout plan to start training.
      </p>
    </div>
  );

  return (
    <>
      {content}
      <Confetti trigger={showConfetti} onComplete={handleConfettiComplete} />
    </>
  );
}
