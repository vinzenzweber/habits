import { auth } from "@/lib/auth";
import { getUserCollections, createCollection } from "@/lib/collection-db";
import { CreateCollectionInput } from "@/lib/collection-types";

export const runtime = "nodejs";

/**
 * GET /api/collections
 * Get all collections for the current user
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collections = await getUserCollections(Number(session.user.id));
    return Response.json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return Response.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 * Create a new collection
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateCollectionInput;

    if (!body.name || typeof body.name !== "string") {
      return Response.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return Response.json(
        { error: "Collection name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const collection = await createCollection(Number(session.user.id), {
      name: body.name.trim(),
      description: body.description?.trim(),
      coverImageUrl: body.coverImageUrl?.trim(),
    });

    return Response.json({ collection }, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return Response.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
