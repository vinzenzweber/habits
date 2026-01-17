import { auth } from "@/lib/auth";
import { getUserRecipeSummaries, createRecipe } from "@/lib/recipes";
import { CreateRecipeInput, isValidRecipeJson } from "@/lib/recipe-types";

export const runtime = "nodejs";

/**
 * GET /api/recipes
 * Get all recipes for the current user
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recipes = await getUserRecipeSummaries();
    return Response.json({ recipes });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return Response.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes
 * Create a new recipe
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as CreateRecipeInput;

    if (!body.title || !body.recipeJson) {
      return Response.json(
        { error: "Missing required fields: title and recipeJson" },
        { status: 400 }
      );
    }

    // Validate recipeJson structure to prevent malformed data
    if (!isValidRecipeJson(body.recipeJson)) {
      return Response.json(
        { error: "Invalid recipeJson structure" },
        { status: 400 }
      );
    }

    const recipe = await createRecipe(body);
    return Response.json({ recipe }, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return Response.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
