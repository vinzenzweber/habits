import { auth } from "@/lib/auth";
import { removeRecipeFromCollection } from "@/lib/collection-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    recipeId: string;
  }>;
};

/**
 * DELETE /api/collections/[id]/recipes/[recipeId]
 * Remove a recipe from a collection
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, recipeId } = await context.params;
  const collectionId = parseInt(id, 10);
  const recipeIdNum = parseInt(recipeId, 10);

  if (isNaN(collectionId)) {
    return Response.json({ error: "Invalid collection ID" }, { status: 400 });
  }
  if (isNaN(recipeIdNum)) {
    return Response.json({ error: "Invalid recipe ID" }, { status: 400 });
  }

  try {
    await removeRecipeFromCollection(
      Number(session.user.id),
      collectionId,
      recipeIdNum
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing recipe from collection:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove recipe from collection";

    if (message.includes("not found") || message.includes("not in")) {
      return Response.json({ error: message }, { status: 404 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
