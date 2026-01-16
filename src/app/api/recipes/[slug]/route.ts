import { auth } from "@/lib/auth";
import { getRecipeBySlug, updateRecipe, deleteRecipe, updateRecipeInPlace } from "@/lib/recipes";
import { UpdateRecipeInput, isValidRecipeJson } from "@/lib/recipe-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/recipes/[slug]
 * Get a single recipe by slug
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

    return Response.json({ recipe });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return Response.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recipes/[slug]
 * Update a recipe
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json() as UpdateRecipeInput;

    // Validate recipeJson structure if provided
    if (body.recipeJson && !isValidRecipeJson(body.recipeJson)) {
      return Response.json(
        { error: "Invalid recipeJson structure" },
        { status: 400 }
      );
    }

    // Ensure recipeJson.slug matches the URL slug to maintain consistency
    // This is important because the URL slug is the source of truth for routing
    if (body.recipeJson && body.recipeJson.slug !== slug) {
      body.recipeJson = { ...body.recipeJson, slug };
    }

    const recipe = await updateRecipe(slug, body);
    return Response.json({ recipe });
  } catch (error) {
    console.error("Error updating recipe:", error);
    if (error instanceof Error && error.message === "Recipe not found") {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }
    return Response.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/recipes/[slug]
 * Update a recipe in place (without creating a new version)
 * Use for minor metadata changes like favorite status, notes, etc.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json() as UpdateRecipeInput;

    const result = await updateRecipeInPlace(slug, body);
    return Response.json(result);
  } catch (error) {
    console.error("Error updating recipe in place:", error);
    if (error instanceof Error && error.message === "Recipe not found or inactive") {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }
    return Response.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[slug]
 * Delete a recipe (soft delete)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    await deleteRecipe(slug);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return Response.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
