import { auth } from "@/lib/auth";
import {
  checkAndAutoApplyShield,
  getStreakPreservationStatus,
} from "@/lib/streakShields";

export const runtime = "nodejs";

/**
 * POST /api/streak/check
 * Called on app open to check and auto-apply shield if needed
 * Returns full streak preservation status
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);

    // Check if shield should be auto-applied for yesterday
    const autoShieldResult = await checkAndAutoApplyShield(userId);

    // Get full status after potential shield application
    const status = await getStreakPreservationStatus();

    return Response.json({
      shieldAutoApplied: autoShieldResult.applied,
      shieldId: autoShieldResult.shieldId,
      status,
    });
  } catch (error) {
    console.error("Error checking streak status:", error);
    return Response.json(
      { error: "Failed to check streak status" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/streak/check
 * Get streak preservation status without triggering auto-shield
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getStreakPreservationStatus();

    return Response.json({ status });
  } catch (error) {
    console.error("Error getting streak status:", error);
    return Response.json(
      { error: "Failed to get streak status" },
      { status: 500 }
    );
  }
}
