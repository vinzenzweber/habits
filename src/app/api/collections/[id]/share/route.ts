import { auth } from "@/lib/auth";
import { getUserByEmail, shareCollection, getCollection } from "@/lib/collection-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * POST /api/collections/[id]/share
 * Share a collection with another user
 * Copies the collection AND all recipes to the recipient
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
    const body = (await request.json()) as {
      recipientEmail: string;
      message?: string;
    };

    if (!body.recipientEmail || typeof body.recipientEmail !== "string") {
      return Response.json(
        { error: "Missing required field: recipientEmail" },
        { status: 400 }
      );
    }

    const email = body.recipientEmail.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Find recipient user
    const recipient = await getUserByEmail(email);
    if (!recipient) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Verify collection exists (for better error message)
    const collection = await getCollection(
      Number(session.user.id),
      collectionId
    );
    if (!collection) {
      return Response.json({ error: "Collection not found" }, { status: 404 });
    }

    // Share the collection
    const result = await shareCollection(
      Number(session.user.id),
      recipient.id,
      collectionId,
      body.message?.trim()
    );

    return Response.json({
      success: true,
      copiedCollectionId: result.copiedCollectionId,
      copiedRecipeCount: result.copiedRecipeIds.length,
      recipientName: recipient.name,
    });
  } catch (error) {
    console.error("Error sharing collection:", error);
    const message =
      error instanceof Error ? error.message : "Failed to share collection";

    if (message === "Cannot share collection with yourself") {
      return Response.json({ error: message }, { status: 400 });
    }
    if (message === "Collection already shared with this user") {
      return Response.json({ error: message }, { status: 409 });
    }
    if (message.includes("not found") || message.includes("not owned")) {
      return Response.json({ error: message }, { status: 404 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
