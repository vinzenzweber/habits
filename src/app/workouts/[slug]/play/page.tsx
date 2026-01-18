import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuidedRoutinePlayer } from "@/components/GuidedRoutinePlayer";
import { getWorkoutBySlug } from "@/lib/workoutPlan";

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

  return <GuidedRoutinePlayer workout={workout} />;
}
