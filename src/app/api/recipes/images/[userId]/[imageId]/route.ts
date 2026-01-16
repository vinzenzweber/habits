/**
 * GET /api/recipes/images/[userId]/[imageId]
 * Serve a recipe image
 */

import { readRecipeImage, recipeImageExists } from "@/lib/recipe-image-storage";
import path from "path";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ userId: string; imageId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId, imageId } = await params;

    // Validate userId and imageId don't contain path traversal
    if (
      userId.includes("..") ||
      userId.includes("/") ||
      imageId.includes("..") ||
      imageId.includes("/")
    ) {
      return new Response("Invalid path", { status: 400 });
    }

    // Validate format (alphanumeric, dashes, underscores only)
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(userId) || !validPattern.test(imageId)) {
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
