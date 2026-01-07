import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { NANO_WORKOUT } from "@/lib/nanoWorkout";
import {
  canDoNanoWorkout,
  recordNanoWorkoutUsage,
} from "@/lib/streakShields";

export const runtime = "nodejs";

/**
 * POST /api/workouts/nano/complete
 * Complete a nano workout
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const { durationSeconds } = await request.json();

    // Check if user can still do nano workout this week
    const canDo = await canDoNanoWorkout(userId);
    if (!canDo) {
      return Response.json(
        { error: "Weekly nano workout limit reached (2 per week)" },
        { status: 400 }
      );
    }

    // Get any active workout to use as workout_id (required by schema)
    const workoutResult = await query(
      `
      SELECT id FROM workouts
      WHERE user_id = $1 AND is_active = true
      LIMIT 1
      `,
      [userId]
    );

    if (!workoutResult.rows[0]) {
      return Response.json({ error: "No workout found" }, { status: 404 });
    }

    const workoutId = workoutResult.rows[0].id;

    // Insert completion with nano type
    const result = await query(
      `
      INSERT INTO workout_completions (
        user_id, workout_id, workout_snapshot, duration_seconds, completion_type
      )
      VALUES ($1, $2, $3, $4, 'nano')
      RETURNING id
      `,
      [userId, workoutId, JSON.stringify(NANO_WORKOUT), durationSeconds || NANO_WORKOUT.totalSeconds]
    );

    // Record nano usage for this week
    await recordNanoWorkoutUsage(userId);

    // Note: Nano workouts don't count toward earning shields
    // (only full workouts do)

    return Response.json({
      success: true,
      completionId: result.rows[0].id,
      message: "Streak saved! Great job doing something today.",
    });
  } catch (error) {
    console.error("Nano workout completion error:", error);
    return Response.json(
      { error: "Failed to save completion" },
      { status: 500 }
    );
  }
}
