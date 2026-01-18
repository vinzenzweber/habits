/**
 * POST /api/recipes/extract-from-image
 * Extract recipe data from an image using GPT-4 Vision and save it
 *
 * Request body:
 *   - imageBase64: Base64-encoded image data
 *
 * Response:
 *   - Success: { slug: string }
 *   - Error: { error: string }
 */

import { auth } from "@/lib/auth";
import { extractRecipeFromImage, toRecipeJson } from "@/lib/recipe-extraction";
import { createRecipe, getUniqueSlug } from "@/lib/recipes";
import { generateSlug } from "@/lib/recipe-types";
import { saveRecipeImage, getRecipeImageUrl } from "@/lib/recipe-image-storage";
import { generateImageId } from "@/lib/image-utils";

export const runtime = "nodejs";

// Maximum base64 image size (approximately 15MB after base64 encoding of 10MB image)
const MAX_BASE64_SIZE = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageBase64 } = body;

    // Validate imageBase64 is provided
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return Response.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    // Validate size
    if (imageBase64.length > MAX_BASE64_SIZE) {
      return Response.json(
        { error: "Image too large. Please use a smaller image." },
        { status: 400 }
      );
    }

    // Extract recipe from image using GPT-4 Vision
    const extractionResult = await extractRecipeFromImage(imageBase64);

    if (!extractionResult.success) {
      return Response.json(
        { error: extractionResult.error },
        { status: 400 }
      );
    }

    const extractedData = extractionResult.data;
    const userId = session.user.id;
    const userIdNum = parseInt(userId, 10);

    // Generate unique slug from title
    const baseSlug = generateSlug(extractedData.title);
    const slug = await getUniqueSlug(userIdNum, baseSlug);

    // Save the uploaded image to storage
    const imageId = generateImageId();
    const imageBuffer = Buffer.from(imageBase64, "base64");
    await saveRecipeImage(userId, imageId, imageBuffer);
    const imageUrl = getRecipeImageUrl(userId, imageId);

    // Build the complete RecipeJson
    const recipeJson = toRecipeJson(extractedData, slug, imageUrl);

    // Create the recipe in the database
    const recipe = await createRecipe({
      title: extractedData.title,
      description: extractedData.description,
      locale: extractedData.locale,
      tags: extractedData.tags,
      recipeJson,
    });

    return Response.json({ slug: recipe.slug }, { status: 201 });
  } catch (error) {
    console.error("Error extracting recipe from image:", error);
    return Response.json(
      { error: "Failed to extract recipe. Please try again." },
      { status: 500 }
    );
  }
}
