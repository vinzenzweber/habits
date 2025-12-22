import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuidedRoutinePlayer } from "@/components/GuidedRoutinePlayer";
import { getWorkoutBySlug } from "@/lib/workoutPlan";

export const dynamic = "force-dynamic";

type WorkoutPageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: WorkoutPageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const workout = getWorkoutBySlug(slug);

  if (!workout) {
    return {
      title: "Workout not found — Habits",
    };
  }

  const label = workout.label;
  const title = workout.title ?? label;
  return {
    title: `${label} | Habits`,
    description: `${workout.title} — ${workout.description}`.trim(),
  };
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { slug } = await Promise.resolve(params);
  const workout = getWorkoutBySlug(slug ?? "");

  if (!workout) {
    notFound();
  }

  return <GuidedRoutinePlayer workout={workout} />;
}
