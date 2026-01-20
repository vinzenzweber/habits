/**
 * ExtractRecipeFromImageJob - Child job for PDF recipe extraction
 *
 * Extracts a recipe from a rendered PDF page image using the Vision API,
 * then saves it to the database for the owning user.
 */
import { Job, Sidequest } from "@/lib/sidequest-runtime";
import { extractRecipeFromImage, toRecipeJson } from "@/lib/recipe-extraction";
import { getUniqueSlug } from "@/lib/recipes";
import { transaction } from "@/lib/db";
import { generateImageId } from "@/lib/image-utils";
import { getRecipeImageUrl, saveRecipeImage } from "@/lib/recipe-image-storage";
import type { RecipeRow } from "@/lib/recipe-types";

export interface ExtractRecipeFromImageJobParams {
  parentJobId: number;
  pageNumber: number;
  imageBase64: string;
  targetLocale: string;
  targetRegion: string;
  userId: number;
}

export interface ExtractRecipeFromImageJobResult {
  parentJobId: number;
  pageNumber: number;
  recipeSlug?: string;
  recipeTitle?: string;
  skipped?: boolean;
}

function isNoRecipeError(message: string): boolean {
  return message.toLowerCase().includes("no recipe");
}

/**
 * Job that extracts a recipe from a page image.
 *
 * Queue: recipe-extraction (concurrency: 3)
 * Timeout: 120000ms (2 minutes)
 * Max attempts: 2
 */
export class ExtractRecipeFromImageJob extends Job {
  async run(
    params: ExtractRecipeFromImageJobParams
  ): Promise<ExtractRecipeFromImageJobResult> {
    const { parentJobId, pageNumber, imageBase64, targetLocale, targetRegion, userId } =
      params;

    // Check if parent job was cancelled before processing
    const parentJob = await Sidequest.job.get(parentJobId);
    if (!parentJob || parentJob.state === "canceled") {
      return {
        parentJobId,
        pageNumber,
        skipped: true,
      };
    }

    const extractionResult = await extractRecipeFromImage(imageBase64, {
      targetLocale,
      targetRegion,
    });

    if (!extractionResult.success) {
      if (isNoRecipeError(extractionResult.error)) {
        return {
          parentJobId,
          pageNumber,
          skipped: true,
        };
      }

      throw new Error(extractionResult.error);
    }

    const extractedData = extractionResult.data;
    const slug = await getUniqueSlug(userId, extractedData.title);

    const userIdString = String(userId);
    const imageId = generateImageId();
    const imageBuffer = Buffer.from(imageBase64, "base64");
    await saveRecipeImage(userIdString, imageId, imageBuffer);

    const imageUrl = getRecipeImageUrl(userIdString, imageId);
    const recipeJson = toRecipeJson(extractedData, slug, imageUrl);

    const recipeRow = await transaction(async (client) => {
      const existingResult = await client.query<{ version: number }>(
        `SELECT MAX(version) as version FROM recipes WHERE user_id = $1 AND slug = $2`,
        [userId, slug]
      );
      const version = (existingResult.rows[0]?.version || 0) + 1;

      await client.query(
        `UPDATE recipes SET is_active = false WHERE user_id = $1 AND slug = $2`,
        [userId, slug]
      );

      const result = await client.query<RecipeRow>(
        `INSERT INTO recipes (
          user_id, slug, version, title, description, locale, tags, recipe_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING slug, title`,
        [
          userId,
          slug,
          version,
          extractedData.title,
          extractedData.description || null,
          extractedData.locale,
          JSON.stringify(extractedData.tags || []),
          JSON.stringify(recipeJson),
        ]
      );

      return result.rows[0];
    });

    return {
      parentJobId,
      pageNumber,
      recipeSlug: recipeRow.slug,
      recipeTitle: recipeRow.title,
    };
  }
}
