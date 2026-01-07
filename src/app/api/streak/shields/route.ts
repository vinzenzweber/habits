import { auth } from "@/lib/auth";
import {
  getAvailableShields,
  applyShield,
} from "@/lib/streakShields";

export const runtime = "nodejs";

/**
 * GET /api/streak/shields
 * Get current shield status
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const status = await getAvailableShields(userId);

    return Response.json(status);
  } catch (error) {
    console.error("Error getting shield status:", error);
    return Response.json(
      { error: "Failed to get shield status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streak/shields
 * Manually use a shield (for proactive use before traveling, etc.)
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const body = await request.json().catch(() => ({}));

    // Optional: specify a date for the shield (defaults to today)
    const forDate = body.date ? new Date(body.date) : undefined;

    const shieldId = await applyShield(userId, forDate);

    if (shieldId) {
      return Response.json({
        success: true,
        shieldId,
        message: "Shield activated! Your streak is protected.",
      });
    } else {
      return Response.json(
        { error: "No shields available" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error using shield:", error);
    return Response.json(
      { error: "Failed to use shield" },
      { status: 500 }
    );
  }
}
