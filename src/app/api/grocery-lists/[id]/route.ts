import { auth } from "@/lib/auth";
import {
  getGroceryList,
  updateGroceryList,
  deleteGroceryList,
} from "@/lib/grocery-db";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/grocery-lists/[id]
 * Get a single grocery list with all items
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return Response.json({ error: "Invalid list ID" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    const list = await getGroceryList(userId, listId);

    if (!list) {
      return Response.json(
        { error: "Grocery list not found" },
        { status: 404 }
      );
    }

    return Response.json({ list });
  } catch (error) {
    console.error("Error fetching grocery list:", error);
    return Response.json(
      { error: "Failed to fetch grocery list" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/grocery-lists/[id]
 * Update grocery list name (owner only)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return Response.json({ error: "Invalid list ID" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    const body = (await request.json()) as { name?: string };

    if (!body.name || typeof body.name !== "string") {
      return Response.json({ error: "List name is required" }, { status: 400 });
    }

    if (body.name.trim().length === 0) {
      return Response.json(
        { error: "List name cannot be empty" },
        { status: 400 }
      );
    }

    await updateGroceryList(userId, listId, body.name);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating grocery list:", error);

    if (error instanceof Error) {
      if (error.message.includes("not the owner")) {
        return Response.json(
          { error: "You do not have permission to update this list" },
          { status: 403 }
        );
      }
      if (error.message.includes("not found")) {
        return Response.json({ error: "List not found" }, { status: 404 });
      }
      if (error.message.includes("characters or less")) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }

    return Response.json(
      { error: "Failed to update grocery list" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grocery-lists/[id]
 * Delete a grocery list (owner only)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return Response.json({ error: "Invalid list ID" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    await deleteGroceryList(userId, listId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting grocery list:", error);

    if (error instanceof Error) {
      if (error.message.includes("not the owner")) {
        return Response.json(
          { error: "You do not have permission to delete this list" },
          { status: 403 }
        );
      }
      if (error.message.includes("not found")) {
        return Response.json({ error: "List not found" }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to delete grocery list" },
      { status: 500 }
    );
  }
}
