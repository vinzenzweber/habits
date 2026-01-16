import { auth } from "@/lib/auth";
import { saveRecipeVersion } from "@/lib/recipes";
import { UpdateRecipeInput } from "@/lib/recipe-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * POST /api/recipes/[slug]/version
 * Create a new version of a recipe
 * Returns the new version number
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json() as UpdateRecipeInput;

    const result = await saveRecipeVersion(slug, body);
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe version:", error);
    if (error instanceof Error && error.message === "Recipe not found") {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }
    return Response.json(
      { error: "Failed to create recipe version" },
      { status: 500 }
    );
  }
}
