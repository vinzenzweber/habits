/**
 * GET /api/recipes/images/[userId]/[imageId]
 * Serve a recipe image
 *
 * Privacy note: Users can only access their own images. This is intentional
 * for privacy - recipe images are personal content. If recipe sharing is
 * implemented in the future, this endpoint should be extended to also allow
 * access to images for recipes that have been explicitly shared with the user.
 */

import { auth } from "@/lib/auth";
import { readRecipeImage, recipeImageExists, isValidPathComponent } from "@/lib/recipe-image-storage";
import path from "path";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ userId: string; imageId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Authenticate and verify the user owns this image
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { userId, imageId } = await params;

    // Verify the userId matches the current session user
    if (session.user.id !== userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Validate format using shared validation function
    if (!isValidPathComponent(userId) || !isValidPathComponent(imageId)) {
      return new Response("Invalid path format", { status: 400 });
    }

    // Build storage path
    const storagePath = path.join("recipes", userId, `${imageId}.jpg`);

    // Check if image exists
    const exists = await recipeImageExists(storagePath);
    if (!exists) {
      return new Response("Image not found", { status: 404 });
    }

    // Read and serve the image
    const imageBuffer = await readRecipeImage(storagePath);

    // Convert Buffer to Uint8Array for Response constructor
    return new Response(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": imageBuffer.length.toString(),
        // Cache for 1 year (immutable content-addressable storage)
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving recipe image:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
