import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import { getRatingHistory } from "@/lib/recipe-ratings";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/recipes/[slug]/ratings
 * Get all ratings across all versions for a recipe
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const recipe = await getRecipeBySlug(slug);

    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    const ratingHistory = await getRatingHistory(recipe.id);
    return Response.json({ ratingHistory });
  } catch (error) {
    console.error("Error fetching recipe ratings:", error);
    return Response.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
