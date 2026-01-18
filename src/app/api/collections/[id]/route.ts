import { auth } from "@/lib/auth";
import {
  getCollection,
  updateCollection,
  deleteCollection,
} from "@/lib/collection-db";
import { UpdateCollectionInput } from "@/lib/collection-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/collections/[id]
 * Get a single collection with its recipes
 */
export async function GET(_request: Request, context: RouteContext) {
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
    const collection = await getCollection(
      Number(session.user.id),
      collectionId
    );

    if (!collection) {
      return Response.json({ error: "Collection not found" }, { status: 404 });
    }

    return Response.json({ collection });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return Response.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collections/[id]
 * Update collection metadata
 */
export async function PATCH(request: Request, context: RouteContext) {
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
    const body = (await request.json()) as UpdateCollectionInput;

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return Response.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      if (body.name.length > 100) {
        return Response.json(
          { error: "Collection name must be 100 characters or less" },
          { status: 400 }
        );
      }
    }

    const updateInput: UpdateCollectionInput = {};
    if (body.name !== undefined) updateInput.name = body.name.trim();
    if (body.description !== undefined)
      updateInput.description = body.description?.trim() || undefined;
    if (body.coverImageUrl !== undefined)
      updateInput.coverImageUrl = body.coverImageUrl?.trim() || undefined;

    const collection = await updateCollection(
      Number(session.user.id),
      collectionId,
      updateInput
    );

    return Response.json({ collection });
  } catch (error) {
    console.error("Error updating collection:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update collection";
    if (message === "Collection not found") {
      return Response.json({ error: message }, { status: 404 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/collections/[id]
 * Delete a collection (does NOT delete the recipes)
 */
export async function DELETE(_request: Request, context: RouteContext) {
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
    await deleteCollection(Number(session.user.id), collectionId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete collection";
    if (message === "Collection not found") {
      return Response.json({ error: message }, { status: 404 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
