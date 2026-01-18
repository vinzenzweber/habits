import { auth } from "@/lib/auth";
import { getCollectionIdsForRecipe } from "@/lib/collection-db";

export const runtime = "nodejs";

/**
 * GET /api/collections/membership?recipeSlug=X
 * Get the IDs of collections that contain a specific recipe.
 * This avoids N+1 queries when checking which collections a recipe is in.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const recipeSlug = searchParams.get("recipeSlug");

  if (!recipeSlug) {
    return Response.json(
      { error: "Missing required query parameter: recipeSlug" },
      { status: 400 }
    );
  }

  try {
    const collectionIds = await getCollectionIdsForRecipe(
      Number(session.user.id),
      recipeSlug
    );
    return Response.json({ collectionIds });
  } catch (error) {
    console.error("Error fetching collection membership:", error);
    return Response.json(
      { error: "Failed to fetch collection membership" },
      { status: 500 }
    );
  }
}
