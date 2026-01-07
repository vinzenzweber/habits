import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkAndEarnShield } from "@/lib/streakShields";

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const { durationSeconds } = await request.json();

    if (!durationSeconds || durationSeconds < 0) {
      return Response.json({ error: "Invalid duration" }, { status: 400 });
    }

    const workout = await query(`
      SELECT id, workout_json FROM workouts
      WHERE user_id = $1 AND slug = $2 AND is_active = true
    `, [session.user.id, slug]);

    if (!workout.rows[0]) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    const userId = parseInt(session.user.id, 10);

    const result = await query(`
      INSERT INTO workout_completions (user_id, workout_id, workout_snapshot, duration_seconds, completion_type)
      VALUES ($1, $2, $3, $4, 'full')
      RETURNING id
    `, [
      userId,
      workout.rows[0].id,
      workout.rows[0].workout_json,
      durationSeconds
    ]);

    // Check if user earned a shield (every 7 consecutive full workouts)
    const shieldResult = await checkAndEarnShield(userId);

    return Response.json({
      success: true,
      completionId: result.rows[0].id,
      shieldEarned: shieldResult.earned,
      streakLength: shieldResult.streakLength
    });
  } catch (error) {
    console.error("Completion tracking error:", error);
    return Response.json({ error: "Failed to save completion" }, { status: 500 });
  }
}
