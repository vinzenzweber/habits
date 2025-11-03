import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkoutPlayer } from "@/components/WorkoutPlayer";
import { getWorkoutMetaBySlug, getWorkoutWithMedia } from "@/lib/workouts";

export const dynamic = "force-dynamic";

type WorkoutPageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: WorkoutPageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const workout = getWorkoutMetaBySlug(slug);

  if (!workout) {
    return {
      title: "Workout not found — Habits",
    };
  }

  const label = workout.label;
  const title = workout.title ?? label;
  return {
    title: `${label} | Habits`,
    description: `Stream the assigned workout for ${label}. ${workout.description ?? ""}`.trim(),
  };
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { slug } = await Promise.resolve(params);
  const workout = await getWorkoutWithMedia(slug ?? "");

  if (!workout) {
    notFound();
  }

  return <WorkoutPlayer workout={workout} />;
}
