import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import {
  shareRecipe,
  findUserByEmail,
  getMySharedRecipes,
  unshareRecipe,
  updateSharePermission,
} from "@/lib/recipe-sharing";
import { SharePermission } from "@/lib/recipe-sharing-types";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/recipes/[slug]/share
 * Get list of users this recipe is shared with (owner only)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const userId = parseInt(session.user.id, 10);

    // Verify recipe exists and user owns it
    const recipe = await getRecipeBySlug(slug);
    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Get all shares for this user's recipes and filter by this recipe
    const allShares = await getMySharedRecipes(userId);
    const shares = allShares.filter((s) => s.recipeSummary.slug === slug);

    return Response.json({ shares });
  } catch (error) {
    console.error("Error fetching shares:", error);
    return Response.json(
      { error: "Failed to fetch shares" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/[slug]/share
 * Share recipe with another user
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const userId = parseInt(session.user.id, 10);
    const body = await request.json() as {
      recipientEmail: string;
      permission?: SharePermission;
      message?: string;
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

    // Get recipe and verify ownership
    const recipe = await getRecipeBySlug(slug);
    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Find recipient by email
    const recipient = await findUserByEmail(body.recipientEmail);
    if (!recipient) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Share the recipe
    const { shareId } = await shareRecipe(
      userId,
      recipient.id,
      recipe.id,
      body.permission ?? "view",
      body.message
    );

    return Response.json({
      shareId,
      sharedWith: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
      },
    });
  } catch (error) {
    console.error("Error sharing recipe:", error);

    if (error instanceof Error) {
      if (error.message === "Cannot share recipe with yourself") {
        return Response.json({ error: error.message }, { status: 400 });
      }
      if (error.message === "Recipe already shared with this user") {
        return Response.json({ error: error.message }, { status: 409 });
      }
      if (error.message === "Recipe not found or not owned by you") {
        return Response.json({ error: "Recipe not found" }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to share recipe" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recipes/[slug]/share
 * Update share permission
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const userId = parseInt(session.user.id, 10);
    const body = await request.json() as {
      shareId: number;
      permission: SharePermission;
    };

    // Validate required fields
    if (!body.shareId || typeof body.shareId !== "number") {
      return Response.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    if (!body.permission || !["view", "edit"].includes(body.permission)) {
      return Response.json(
        { error: "Permission must be 'view' or 'edit'" },
        { status: 400 }
      );
    }

    // Verify recipe exists and user owns it
    const recipe = await getRecipeBySlug(slug);
    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Update permission
    await updateSharePermission(userId, body.shareId, body.permission);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating share permission:", error);

    if (error instanceof Error) {
      if (error.message === "Share not found or you are not the owner") {
        return Response.json({ error: "Share not found" }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to update permission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[slug]/share
 * Remove share access
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const userId = parseInt(session.user.id, 10);

    // Get shareId from query params
    const url = new URL(request.url);
    const shareIdParam = url.searchParams.get("shareId");

    if (!shareIdParam) {
      return Response.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    const shareId = parseInt(shareIdParam, 10);
    if (isNaN(shareId)) {
      return Response.json(
        { error: "Invalid share ID" },
        { status: 400 }
      );
    }

    // Verify recipe exists and user owns it
    const recipe = await getRecipeBySlug(slug);
    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Remove share
    await unshareRecipe(userId, shareId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing share:", error);

    if (error instanceof Error) {
      if (error.message === "Share not found or you are not the owner") {
        return Response.json({ error: "Share not found" }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to remove share" },
      { status: 500 }
    );
  }
}
