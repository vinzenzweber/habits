import { auth } from "@/lib/auth";
import {
  addFavorite,
  removeFavorite,
  getFavoriteStatusBySlug,
} from "@/lib/recipe-favorites";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/recipes/[slug]/favorite
 * Get favorite status for a recipe
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const result = await getFavoriteStatusBySlug(slug);

    if (!result) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    return Response.json({ isFavorite: result.isFavorite });
  } catch (error) {
    console.error("Error fetching favorite status:", error);
    return Response.json(
      { error: "Failed to fetch favorite status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/[slug]/favorite
 * Add recipe to favorites
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const result = await getFavoriteStatusBySlug(slug);

    if (!result) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    await addFavorite(result.recipeId);

    return Response.json({ success: true, isFavorite: true });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return Response.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[slug]/favorite
 * Remove recipe from favorites
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const result = await getFavoriteStatusBySlug(slug);

    if (!result) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    await removeFavorite(result.recipeId);

    return Response.json({ success: true, isFavorite: false });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return Response.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
