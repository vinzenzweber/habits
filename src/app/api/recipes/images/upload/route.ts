/**
 * POST /api/recipes/images/upload
 * Upload a recipe image
 * Accepts multipart/form-data with an 'image' field
 * Returns the image URL for use in recipe JSON
 */

import { auth } from "@/lib/auth";
import { saveRecipeImage, getRecipeImageUrl } from "@/lib/recipe-image-storage";

export const runtime = "nodejs";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Generate unique image ID
    const imageId = generateImageId();
    const userId = session.user.id;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save the image
    const result = await saveRecipeImage(userId, imageId, buffer);

    // Return the URL that can be used in recipe JSON
    const url = getRecipeImageUrl(userId, imageId);

    return Response.json({
      url,
      storagePath: result.storagePath,
      fileSizeBytes: result.fileSizeBytes,
    }, { status: 201 });
  } catch (error) {
    console.error("Error uploading recipe image:", error);
    return Response.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique image ID
 */
function generateImageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
