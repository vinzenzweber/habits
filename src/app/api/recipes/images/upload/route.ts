/**
 * POST /api/recipes/images/upload
 * Upload a recipe image
 * Accepts multipart/form-data with an 'image' field
 * Returns the image URL for use in recipe JSON
 */

import { auth } from "@/lib/auth";
import { generateImageId } from "@/lib/image-utils";
import { saveRecipeImage, getRecipeImageUrl } from "@/lib/recipe-image-storage";

export const runtime = "nodejs";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Magic bytes for image format validation
// JPEG files start with FF D8 FF
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
// PNG files start with 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// GIF files start with GIF87a or GIF89a
const GIF87_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
// WebP files start with RIFF....WEBP
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

/**
 * Validate that a buffer contains valid image data by checking magic bytes.
 * This prevents malicious file uploads disguised as images.
 */
function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // Check JPEG
  if (
    buffer[0] === JPEG_MAGIC[0] &&
    buffer[1] === JPEG_MAGIC[1] &&
    buffer[2] === JPEG_MAGIC[2]
  ) {
    return true;
  }

  // Check PNG
  if (PNG_MAGIC.every((byte, i) => buffer[i] === byte)) {
    return true;
  }

  // Check GIF87a
  if (GIF87_MAGIC.every((byte, i) => buffer[i] === byte)) {
    return true;
  }

  // Check GIF89a
  if (GIF89_MAGIC.every((byte, i) => buffer[i] === byte)) {
    return true;
  }

  // Check WebP (RIFF at start, WEBP at offset 8)
  if (
    RIFF_MAGIC.every((byte, i) => buffer[i] === byte) &&
    WEBP_MAGIC.every((byte, i) => buffer[8 + i] === byte)
  ) {
    return true;
  }

  return false;
}

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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate that the buffer contains valid image data (magic bytes check)
    // This prevents malicious file uploads disguised as images
    if (!isValidImageBuffer(buffer)) {
      return Response.json(
        { error: "Invalid image data. File does not appear to be a valid image." },
        { status: 400 }
      );
    }

    // Generate unique image ID
    const imageId = generateImageId();
    const userId = session.user.id;

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
