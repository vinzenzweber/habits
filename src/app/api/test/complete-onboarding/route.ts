import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateWorkoutPlan } from "@/lib/workout-generator";

export const runtime = 'nodejs';

// Test-only endpoint to quickly complete onboarding
// Only available in development/test environments
export async function POST() {
  // Block in production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return Response.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Check if already completed
    const userResult = await query(
      `SELECT onboarding_completed FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows[0]?.onboarding_completed) {
      return Response.json({ success: true, message: "Already completed" });
    }

    // Generate default workout plan
    await generateWorkoutPlan(userId, {
      experienceLevel: 'intermediate',
      primaryGoal: 'general_fitness',
      daysPerWeek: 4,
      minutesPerSession: 30,
      equipment: ['bodyweight', 'dumbbells'],
      limitations: []
    });

    // Mark onboarding as complete
    await query(`
      UPDATE users
      SET onboarding_completed = true, onboarding_completed_at = NOW()
      WHERE id = $1
    `, [userId]);

    return Response.json({ success: true, message: "Onboarding completed" });
  } catch (error) {
    console.error("Test complete-onboarding error:", error);
    const message = error instanceof Error ? error.message : "Failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
