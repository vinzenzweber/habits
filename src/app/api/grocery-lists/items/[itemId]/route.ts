import { auth } from "@/lib/auth";
import {
  toggleGroceryItem,
  updateGroceryItem,
  removeGroceryItem,
} from "@/lib/grocery-db";
import { UpdateGroceryItemInput, GROCERY_CATEGORIES } from "@/lib/grocery-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ itemId: string }> };

/**
 * PATCH /api/grocery-lists/items/[itemId]
 * Toggle checked state or update item properties
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemId: itemIdStr } = await params;
    const itemId = parseInt(itemIdStr, 10);

    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    const body = (await request.json()) as
      | { checked: boolean }
      | UpdateGroceryItemInput;

    // If only `checked` field is provided, toggle the item
    if ("checked" in body && typeof body.checked === "boolean") {
      const item = await toggleGroceryItem(userId, itemId, body.checked);
      return Response.json({ item });
    }

    // Otherwise, update the item properties
    const updates = body as UpdateGroceryItemInput;

    // Validate category if provided
    if (
      updates.category !== undefined &&
      updates.category !== null &&
      !GROCERY_CATEGORIES.includes(updates.category)
    ) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }

    // Validate quantity if provided
    if (
      updates.quantity !== undefined &&
      updates.quantity !== null &&
      typeof updates.quantity !== "number"
    ) {
      return Response.json(
        { error: "Quantity must be a number" },
        { status: 400 }
      );
    }

    const item = await updateGroceryItem(userId, itemId, {
      ingredientName: updates.ingredientName?.trim(),
      quantity: updates.quantity,
      unit: updates.unit?.trim(),
      category: updates.category,
      position: updates.position,
    });

    return Response.json({ item });
  } catch (error) {
    console.error("Error updating grocery item:", error);

    if (error instanceof Error) {
      if (error.message === "Item not found") {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      if (error.message.includes("access denied")) {
        return Response.json(
          { error: "You do not have permission to update this item" },
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
      { error: "Failed to update grocery item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grocery-lists/items/[itemId]
 * Remove an item from a list
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemId: itemIdStr } = await params;
    const itemId = parseInt(itemIdStr, 10);

    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);
    await removeGroceryItem(userId, itemId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing grocery item:", error);

    if (error instanceof Error) {
      if (error.message === "Item not found") {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      if (error.message.includes("access denied")) {
        return Response.json(
          { error: "You do not have permission to remove this item" },
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
      { error: "Failed to remove grocery item" },
      { status: 500 }
    );
  }
}
