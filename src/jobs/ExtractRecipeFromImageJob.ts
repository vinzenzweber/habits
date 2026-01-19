/**
 * ExtractRecipeFromImageJob - Placeholder for child job
 *
 * This job extracts a recipe from a page image using the OpenAI Vision API.
 * Full implementation is tracked in issue #228.
 *
 * This placeholder allows ProcessPdfJob to compile and be tested.
 */
import { Job } from "sidequest";

export interface ExtractRecipeFromImageJobParams {
  pdfJobId: number;
  pageNumber: number;
  imageBase64: string;
  targetLocale: string;
  targetRegion: string;
  userId: number;
}

export interface ExtractRecipeFromImageJobResult {
  pdfJobId: number;
  pageNumber: number;
  recipeSlug?: string;
  recipeTitle?: string;
  skipped?: boolean;
}

/**
 * Job that extracts a recipe from a page image.
 *
 * Queue: recipe-extraction (concurrency: 3)
 * Timeout: 120000ms (2 minutes)
 * Max attempts: 2
 *
 * TODO: Implement in issue #228
 */
export class ExtractRecipeFromImageJob extends Job {
  async run(
    _params: ExtractRecipeFromImageJobParams
  ): Promise<ExtractRecipeFromImageJobResult> {
    // Placeholder implementation - will be replaced in issue #228
    throw new Error(
      "ExtractRecipeFromImageJob not yet implemented. See issue #228."
    );
  }
}
