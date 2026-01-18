import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { forkRecipe } from "@/lib/recipe-sharing";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * POST /api/recipes/[slug]/fork
 * Fork a shared recipe to create own copy
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const userId = parseInt(session.user.id, 10);

    // Find the recipe ID from slug
    // We need to look up by slug across all users since it's a shared recipe
    const recipeResult = await query<{ id: number; user_id: number }>(
      `SELECT id, user_id FROM recipes
       WHERE slug = $1 AND is_active = true
       ORDER BY version DESC LIMIT 1`,
      [slug]
    );

    if (recipeResult.rows.length === 0) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipeId = recipeResult.rows[0].id;

    // Fork the recipe
    const { forkedSlug } = await forkRecipe(userId, recipeId);

    return Response.json({ slug: forkedSlug });
  } catch (error) {
    console.error("Error forking recipe:", error);

    if (error instanceof Error) {
      if (error.message === "Recipe not shared with you") {
        return Response.json(
          { error: "Recipe not shared with you" },
          { status: 403 }
        );
      }
      if (error.message === "You have already forked this recipe") {
        return Response.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message === "Original recipe not found") {
        return Response.json({ error: "Recipe not found" }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to fork recipe" },
      { status: 500 }
    );
  }
}
