import { auth } from "@/lib/auth";
import { getUserGroceryLists, createGroceryList } from "@/lib/grocery-db";
import { CreateGroceryListInput } from "@/lib/grocery-types";

export const runtime = "nodejs";

/**
 * GET /api/grocery-lists
 * Get all grocery lists for the current user (owned + shared with them)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const lists = await getUserGroceryLists(userId);
    return Response.json({ lists });
  } catch (error) {
    console.error("Error fetching grocery lists:", error);
    return Response.json(
      { error: "Failed to fetch grocery lists" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/grocery-lists
 * Create a new grocery list
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const body = (await request.json()) as CreateGroceryListInput;

    if (!body.name || typeof body.name !== "string") {
      return Response.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    if (body.name.trim().length === 0) {
      return Response.json(
        { error: "List name cannot be empty" },
        { status: 400 }
      );
    }

    const result = await createGroceryList(userId, { name: body.name });
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating grocery list:", error);

    if (error instanceof Error) {
      if (error.message.includes("characters or less")) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }

    return Response.json(
      { error: "Failed to create grocery list" },
      { status: 500 }
    );
  }
}
