import { auth } from "@/lib/auth";
import { getReceivedCollections } from "@/lib/collection-db";

export const runtime = "nodejs";

/**
 * GET /api/collections/shared/received
 * Get collections that have been shared with the current user
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const receivedCollections = await getReceivedCollections(
      Number(session.user.id)
    );
    return Response.json({ collections: receivedCollections });
  } catch (error) {
    console.error("Error fetching received collections:", error);
    return Response.json(
      { error: "Failed to fetch received collections" },
      { status: 500 }
    );
  }
}
