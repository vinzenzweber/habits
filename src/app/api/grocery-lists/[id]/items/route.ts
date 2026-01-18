import { auth } from "@/lib/auth";
import { addGroceryItem } from "@/lib/grocery-db";
import { CreateGroceryItemInput, GROCERY_CATEGORIES } from "@/lib/grocery-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/grocery-lists/[id]/items
 * Add an item to a grocery list
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
    const body = (await request.json()) as CreateGroceryItemInput;

    // Validate required field
    if (!body.ingredientName || typeof body.ingredientName !== "string") {
      return Response.json(
        { error: "Ingredient name is required" },
        { status: 400 }
      );
    }

    if (body.ingredientName.trim().length === 0) {
      return Response.json(
        { error: "Ingredient name cannot be empty" },
        { status: 400 }
      );
    }

    // Validate optional category
    if (
      body.category !== undefined &&
      !GROCERY_CATEGORIES.includes(body.category)
    ) {
      return Response.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Validate optional quantity
    if (body.quantity !== undefined && typeof body.quantity !== "number") {
      return Response.json(
        { error: "Quantity must be a number" },
        { status: 400 }
      );
    }

    const item = await addGroceryItem(userId, listId, {
      ingredientName: body.ingredientName.trim(),
      quantity: body.quantity,
      unit: body.unit?.trim(),
      category: body.category,
      fromRecipeId: body.fromRecipeId,
      position: body.position,
    });

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error adding grocery item:", error);

    if (error instanceof Error) {
      if (error.message.includes("access denied")) {
        return Response.json(
          { error: "You do not have permission to add items to this list" },
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
      { error: "Failed to add grocery item" },
      { status: 500 }
    );
  }
}
