import { auth } from "@/lib/auth";
import { getSharedWithMe } from "@/lib/recipe-sharing";

export const runtime = "nodejs";

/**
 * GET /api/recipes/shared
 * Get recipes shared with the current user
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const recipes = await getSharedWithMe(userId);

    return Response.json({ recipes });
  } catch (error) {
    console.error("Error fetching shared recipes:", error);
    return Response.json(
      { error: "Failed to fetch shared recipes" },
      { status: 500 }
    );
  }
}
