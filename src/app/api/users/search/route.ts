import { auth } from "@/lib/auth";
import { findUserByEmail } from "@/lib/recipe-sharing";

export const runtime = "nodejs";

/**
 * GET /api/users/search?email=...
 * Search for users by email (for sharing)
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return Response.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ user: null });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return Response.json({ user: null });
    }

    // Don't return the current user as a search result
    const currentUserId = parseInt(session.user.id, 10);
    if (user.id === currentUserId) {
      return Response.json({ user: null, isSelf: true });
    }

    // Return minimal user info (not exposing internal ID to client)
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return Response.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
