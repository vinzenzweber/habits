"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { GuidedRoutinePlayer } from "./GuidedRoutinePlayer";
import type { WorkoutWithMedia } from "@/lib/workouts";
import { useAutoplayCapability } from "@/lib/pwa";

type WorkoutPlayerProps = {
  workout: WorkoutWithMedia;
};

type ViewMode = "guided" | "video";

function VideoWorkoutView({
  workout,
  onSelectGuided,
}: {
  workout: WorkoutWithMedia;
  onSelectGuided?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const { canAutoplayUnmuted, platform } = useAutoplayCapability();

  const handlePlayWithSound = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen();
      } else if (
        typeof (video as typeof video & { webkitEnterFullscreen?: () => void })
          .webkitEnterFullscreen === "function"
      ) {
        (video as typeof video & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
      }
    } catch (error) {
      console.warn("Fullscreen request failed", error);
    }

    try {
      video.muted = false;
      setIsMuted(false);
      await video.play();
      setShowPlayButton(false);
    } catch (error) {
      console.warn("Unmuted playback blocked, trying muted", error);
      video.muted = true;
      setIsMuted(true);

      try {
        await video.play();
        setShowPlayButton(false);
      } catch (innerError) {
        console.warn("Autoplay completely blocked", innerError);
      }
    }
  };

  useEffect(() => {
    if (!workout.videoUrl || !canAutoplayUnmuted) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const autoStart = async () => {
      if (cancelled) return;

      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            video.removeEventListener("canplay", onCanPlay);
            resolve();
          };
          video.addEventListener("canplay", onCanPlay, { once: true });
        });
      }

      if (cancelled) return;
      await handlePlayWithSound();
    };

    void autoStart();

    return () => {
      cancelled = true;
    };
  }, [workout.videoUrl, canAutoplayUnmuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  const handleMuteToggle = () => {
    setIsMuted((previous) => !previous);
  };

  if (!workout.videoUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-slate-100">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          No video assigned for {workout.label} yet.
        </h1>
        <p className="max-w-md text-sm text-slate-300 sm:text-base">
          Upload a video in the media manager and link it to this day to start
          streaming your routine.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onSelectGuided ? (
            <button
              type="button"
              onClick={onSelectGuided}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
            >
              Start guided timer
            </button>
          ) : null}
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-emerald-400/60 hover:text-emerald-300"
          >
            Open Media Manager
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-white">
      <video
        ref={videoRef}
        className="h-full w-full flex-1 bg-black object-cover"
        controls
        playsInline
        preload="auto"
        disablePictureInPicture
        poster={workout.thumbnailUrl ?? undefined}
      >
        <source src={workout.videoUrl} type="video/mp4" />
        Your browser does not support the video element.
      </video>

      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <button
            type="button"
            onClick={handlePlayWithSound}
            className="flex flex-col items-center gap-4 rounded-3xl bg-emerald-500 px-12 py-8 text-center shadow-2xl shadow-emerald-500/30 transition hover:bg-emerald-400 hover:shadow-emerald-400/40 active:scale-95"
          >
            <svg
              className="h-16 w-16 text-slate-950"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-lg font-bold uppercase tracking-[0.2em] text-slate-950">
              Play with Sound
            </span>
            {platform === "ios" && (
              <span className="text-xs text-slate-900">
                Tap to play in fullscreen
              </span>
            )}
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pb-16 pt-8 sm:px-8">
        <div className="pointer-events-auto flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-[0.35em] text-emerald-300">
          <Link
            href="/"
            className="rounded-full border border-white/30 px-4 py-2 text-[10px] font-semibold tracking-[0.4em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
          >
            Home
          </Link>
          <span>{workout.label}</span>
          {onSelectGuided ? (
            <button
              type="button"
              onClick={onSelectGuided}
              className="rounded-full border border-white/30 px-4 py-2 text-[10px] font-semibold tracking-[0.35em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
            >
              Guided timer
            </button>
          ) : (
            <span className="w-[108px]" aria-hidden />
          )}
        </div>
        <div className="pointer-events-auto max-w-xl space-y-3">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {workout.title}
          </h1>
          {workout.originalFilename ? (
            <p className="text-sm text-slate-200 sm:text-base">
              Now playing: {workout.originalFilename}
            </p>
          ) : null}
        </div>
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={handleMuteToggle}
            className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-xs font-medium uppercase tracking-widest text-white transition hover:bg-white/25"
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkoutPlayer({ workout }: WorkoutPlayerProps) {
  const hasRoutine = Boolean(workout.routine);
  const hasVideo = Boolean(workout.videoUrl);
  const defaultView: ViewMode = hasRoutine ? "guided" : "video";
  const [view, setView] = useState<ViewMode>(defaultView);
  const activeView: ViewMode =
    view === "video" && !hasVideo && hasRoutine ? "guided" : view;

  if (activeView === "guided" && workout.routine) {
    return (
      <GuidedRoutinePlayer
        key={workout.slug}
        workout={workout}
        onSelectVideo={hasVideo ? () => setView("video") : undefined}
      />
    );
  }

  if (hasVideo) {
    return (
      <VideoWorkoutView
        workout={workout}
        onSelectGuided={hasRoutine ? () => setView("guided") : undefined}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-slate-100">
      <h1 className="text-3xl font-semibold sm:text-4xl">
        No guided or video workout found.
      </h1>
      <p className="max-w-md text-sm text-slate-300 sm:text-base">
        Add a routine to the codebase or upload a video for {workout.label} to
        start training.
      </p>
      <Link
        href="/"
        className="rounded-full border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-emerald-400/60 hover:text-emerald-300"
      >
        Back home
      </Link>
    </div>
  );
}
