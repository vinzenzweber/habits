import { auth } from "@/lib/auth";
import { getRecipeVersions } from "@/lib/recipes";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/recipes/[slug]/versions
 * Get version history for a recipe
 * Supports pagination via ?limit=N&offset=M query params
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;

    // Parse optional pagination query params
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const options: { limit?: number; offset?: number } = {};
    if (limitParam !== null) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        options.limit = limit;
      }
    }
    if (offsetParam !== null) {
      const offset = parseInt(offsetParam, 10);
      if (!isNaN(offset) && offset >= 0) {
        options.offset = offset;
      }
    }

    const versions = await getRecipeVersions(slug, options);
    return Response.json({ versions });
  } catch (error) {
    console.error("Error fetching recipe versions:", error);
    return Response.json(
      { error: "Failed to fetch recipe versions" },
      { status: 500 }
    );
  }
}
