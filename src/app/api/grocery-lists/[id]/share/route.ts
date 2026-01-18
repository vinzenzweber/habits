import { auth } from "@/lib/auth";
import {
  getListShares,
  shareGroceryList,
  updateSharePermission,
  unshareGroceryList,
} from "@/lib/grocery-db";
import { GroceryListPermission } from "@/lib/grocery-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/grocery-lists/[id]/share
 * Get shares for a list (owner only)
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
    const shares = await getListShares(userId, listId);

    return Response.json({ shares });
  } catch (error) {
    console.error("Error fetching shares:", error);

    if (error instanceof Error) {
      if (error.message.includes("not the owner")) {
        return Response.json(
          { error: "Only the owner can view shares" },
          { status: 403 }
        );
      }
      if (error.message.includes("not found")) {
        return Response.json({ error: "List not found" }, { status: 404 });
      }
    }

    return Response.json({ error: "Failed to fetch shares" }, { status: 500 });
  }
}

/**
 * POST /api/grocery-lists/[id]/share
 * Share list with another user
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    const body = (await request.json()) as {
      recipientEmail: string;
      permission?: GroceryListPermission;
    };

    // Validate required field
    if (!body.recipientEmail || typeof body.recipientEmail !== "string") {
      return Response.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Validate permission if provided
    if (body.permission && !["view", "edit"].includes(body.permission)) {
      return Response.json(
        { error: "Permission must be 'view' or 'edit'" },
        { status: 400 }
      );
    }

    const result = await shareGroceryList(
      userId,
      listId,
      body.recipientEmail,
      body.permission ?? "edit"
    );

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Error sharing list:", error);

    if (error instanceof Error) {
      if (error.message === "Cannot share list with yourself") {
        return Response.json({ error: error.message }, { status: 400 });
      }
      if (error.message === "List already shared with this user") {
        return Response.json({ error: error.message }, { status: 409 });
      }
      if (error.message === "User not found with that email") {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      if (error.message.includes("not the owner")) {
        return Response.json(
          { error: "Only the owner can share this list" },
          { status: 403 }
        );
      }
      if (error.message.includes("not found")) {
        return Response.json({ error: "List not found" }, { status: 404 });
      }
    }

    return Response.json({ error: "Failed to share list" }, { status: 500 });
  }
}

/**
 * PATCH /api/grocery-lists/[id]/share
 * Update share permission
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
    const body = (await request.json()) as {
      shareId: number;
      permission: GroceryListPermission;
    };

    // Validate required fields
    if (!body.shareId || typeof body.shareId !== "number") {
      return Response.json({ error: "Share ID is required" }, { status: 400 });
    }

    if (!body.permission || !["view", "edit"].includes(body.permission)) {
      return Response.json(
        { error: "Permission must be 'view' or 'edit'" },
        { status: 400 }
      );
    }

    await updateSharePermission(userId, body.shareId, body.permission);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating share permission:", error);

    if (error instanceof Error) {
      if (error.message.includes("not the owner")) {
        return Response.json(
          { error: "Share not found or you are not the owner" },
          { status: 404 }
        );
      }
    }

    return Response.json(
      { error: "Failed to update permission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grocery-lists/[id]/share
 * Remove share access (via query param ?shareId=X)
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

    // Get shareId from query params
    const url = new URL(request.url);
    const shareIdParam = url.searchParams.get("shareId");

    if (!shareIdParam) {
      return Response.json({ error: "Share ID is required" }, { status: 400 });
    }

    const shareId = parseInt(shareIdParam, 10);
    if (isNaN(shareId)) {
      return Response.json({ error: "Invalid share ID" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    await unshareGroceryList(userId, shareId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing share:", error);

    if (error instanceof Error) {
      if (error.message.includes("not the owner")) {
        return Response.json(
          { error: "Share not found or you are not the owner" },
          { status: 404 }
        );
      }
    }

    return Response.json({ error: "Failed to remove share" }, { status: 500 });
  }
}
