import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GuidedRoutinePlayer } from "@/components/GuidedRoutinePlayer";
import { NANO_WORKOUT } from "@/lib/nanoWorkout";
import { canDoNanoWorkout } from "@/lib/streakShields";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nano Workout | Play | Habits",
  description: "Playing: Nano Workout - 3 minute streak saver",
};

export default async function NanoPlayPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id, 10);
  const canDo = await canDoNanoWorkout(userId);

  if (!canDo) {
    redirect("/workouts/nano");
  }

  // Add label property required by GuidedRoutinePlayer
  const nanoWorkoutWithLabel = {
    ...NANO_WORKOUT,
    label: "Nano",
  };

  return <GuidedRoutinePlayer workout={nanoWorkoutWithLabel} isNano />;
}
