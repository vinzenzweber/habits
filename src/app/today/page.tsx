import type { Metadata } from "next";

import { WorkoutPlayer } from "@/components/WorkoutPlayer";
import { getWorkoutForToday } from "@/lib/workouts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const workout = await getWorkoutForToday();

  if (!workout) {
    return {
      title: "Today — Habits",
    };
  }

  return {
    title: `Today — ${workout.label} | Habits`,
    description: workout.originalFilename
      ? `Streaming ${workout.originalFilename}.`
      : "Assign a video for today in the media manager.",
  };
}

export default async function TodayPage() {
  const workout = await getWorkoutForToday();
  if (!workout) {
    throw new Error("Workout metadata missing");
  }

  return <WorkoutPlayer workout={workout} />;
}
