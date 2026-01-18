import { auth } from "@/lib/auth";
import { clearCheckedItems } from "@/lib/grocery-db";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/grocery-lists/[id]/checked
 * Clear all checked items from a list
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
    const deletedCount = await clearCheckedItems(userId, listId);

    return Response.json({ deletedCount });
  } catch (error) {
    console.error("Error clearing checked items:", error);

    if (error instanceof Error) {
      if (error.message.includes("access denied")) {
        return Response.json(
          { error: "You do not have permission to clear items from this list" },
          { status: 403 }
        );
      }
      if (error.message.includes("edit permission")) {
        return Response.json(
          { error: "You do not have edit permission for this list" },
          { status: 403 }
        );
      }
    }

    return Response.json(
      { error: "Failed to clear checked items" },
      { status: 500 }
    );
  }
}
