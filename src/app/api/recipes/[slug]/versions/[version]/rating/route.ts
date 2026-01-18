import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import {
  upsertRating,
  getUserRatingForVersion,
  getVersionRatings,
} from "@/lib/recipe-ratings";
import { CreateRatingInput } from "@/lib/recipe-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string; version: string }> };

/**
 * GET /api/recipes/[slug]/versions/[version]/rating
 * Get ratings for a specific version (includes user's own rating if exists)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug, version: versionStr } = await params;
    const version = parseInt(versionStr, 10);

    if (isNaN(version) || version < 1) {
      return Response.json({ error: "Invalid version" }, { status: 400 });
    }

    const recipe = await getRecipeBySlug(slug);
    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    const [versionStats, userRating] = await Promise.all([
      getVersionRatings(recipe.id, version),
      getUserRatingForVersion(recipe.id, version),
    ]);

    return Response.json({
      versionStats,
      userRating,
    });
  } catch (error) {
    console.error("Error fetching version ratings:", error);
    return Response.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/[slug]/versions/[version]/rating
 * Add or update a rating for a specific version
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug, version: versionStr } = await params;
    const version = parseInt(versionStr, 10);

    if (isNaN(version) || version < 1) {
      return Response.json({ error: "Invalid version" }, { status: 400 });
    }

    const recipe = await getRecipeBySlug(slug);
    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = (await request.json()) as CreateRatingInput;

    // Validate rating
    if (typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return Response.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const rating = await upsertRating(recipe.id, version, body);
    return Response.json({ rating });
  } catch (error) {
    console.error("Error saving rating:", error);
    return Response.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
