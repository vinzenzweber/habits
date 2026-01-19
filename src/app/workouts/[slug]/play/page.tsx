import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuidedRoutinePlayer } from "@/components/GuidedRoutinePlayer";
import { getWorkoutBySlug } from "@/lib/workoutPlan";
import { getExercisesWithCompleteImages } from "@/lib/exercise-library";

export const dynamic = "force-dynamic";

type PlayPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const workout = await getWorkoutBySlug(slug);

  if (!workout) {
    return {
      title: "Workout not found — Habits",
    };
  }

  return {
    title: `${workout.label} | Play | Habits`,
    description: `Playing: ${workout.title}`,
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { slug } = await Promise.resolve(params);
  const workout = await getWorkoutBySlug(slug ?? "");

  if (!workout) {
    notFound();
  }

  // Fetch which exercises have images available to prevent 400 errors
  const exerciseNames = workout.segments
    .filter(s => s.category !== 'rest' && s.category !== 'prep')
    .map(s => s.title);
  const availableImages = await getExercisesWithCompleteImages(exerciseNames);

  return <GuidedRoutinePlayer workout={workout} availableImages={availableImages} />;
}
