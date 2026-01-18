import { auth } from "@/lib/auth";
import { checkListUpdated, getGroceryList } from "@/lib/grocery-db";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/grocery-lists/[id]/sync
 * Check if list has been updated since a given timestamp
 * Returns the updated list data if changed
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

    // Get "since" timestamp from query params
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");

    if (!sinceParam) {
      return Response.json(
        { error: "The 'since' query parameter is required" },
        { status: 400 }
      );
    }

    const since = new Date(sinceParam);
    if (isNaN(since.getTime())) {
      return Response.json(
        { error: "Invalid 'since' timestamp" },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id, 10);
    const { updated, updatedAt } = await checkListUpdated(userId, listId, since);

    if (!updated) {
      return Response.json({ updated: false, updatedAt });
    }

    // Fetch the full list data since it was updated
    const list = await getGroceryList(userId, listId);

    return Response.json({
      updated: true,
      updatedAt,
      list,
    });
  } catch (error) {
    console.error("Error checking list sync:", error);

    if (error instanceof Error) {
      if (error.message.includes("access denied")) {
        return Response.json(
          { error: "You do not have access to this list" },
          { status: 403 }
        );
      }
      if (error.message.includes("not found")) {
        return Response.json({ error: "List not found" }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to check list sync" },
      { status: 500 }
    );
  }
}
