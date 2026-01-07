import { auth } from "@/lib/auth";
import { NANO_WORKOUT } from "@/lib/nanoWorkout";
import { canDoNanoWorkout } from "@/lib/streakShields";

export const runtime = "nodejs";

/**
 * GET /api/workouts/nano
 * Check if user can do a nano workout and return the workout definition
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const canDo = await canDoNanoWorkout(userId);

    return Response.json({
      available: canDo,
      workout: canDo ? NANO_WORKOUT : null,
    });
  } catch (error) {
    console.error("Error checking nano workout availability:", error);
    return Response.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
