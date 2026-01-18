import { auth } from "@/lib/auth";
import { addRecipeToCollection } from "@/lib/collection-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * POST /api/collections/[id]/recipes
 * Add a recipe to a collection
 */
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const collectionId = parseInt(id, 10);
  if (isNaN(collectionId)) {
    return Response.json({ error: "Invalid collection ID" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { recipeId: number };

    if (!body.recipeId || typeof body.recipeId !== "number") {
      return Response.json(
        { error: "Missing required field: recipeId" },
        { status: 400 }
      );
    }

    const item = await addRecipeToCollection(
      Number(session.user.id),
      collectionId,
      body.recipeId
    );

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error adding recipe to collection:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to add recipe to collection";

    // Handle specific errors
    if (
      message.includes("not found") ||
      message.includes("not owned by user")
    ) {
      return Response.json({ error: message }, { status: 404 });
    }
    if (message.includes("duplicate") || message.includes("already")) {
      return Response.json(
        { error: "Recipe is already in this collection" },
        { status: 409 }
      );
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
