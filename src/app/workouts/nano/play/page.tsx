import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GuidedRoutinePlayer } from "@/components/GuidedRoutinePlayer";
import { NANO_WORKOUT } from "@/lib/nanoWorkout";
import { canDoNanoWorkout } from "@/lib/streakShields";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("workout");
  return {
    title: `${t("streakSaver")} | FitStreak`,
    description: "Playing: Nano Workout - 3 minute streak saver",
  };
}

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
