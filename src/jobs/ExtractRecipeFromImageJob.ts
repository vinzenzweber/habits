/**
 * ExtractRecipeFromImageJob - Placeholder for child job
 *
 * This job extracts a recipe from a page image using the OpenAI Vision API.
 * Full implementation is tracked in issue #228.
 *
 * This placeholder allows ProcessPdfJob to compile and be tested.
 */
import { Job } from "sidequest";
import { query } from "@/lib/db";

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
    params: ExtractRecipeFromImageJobParams
  ): Promise<ExtractRecipeFromImageJobResult> {
    const { pdfJobId, pageNumber } = params;

    // Check if parent job was cancelled before processing
    const parentJob = await query(
      `SELECT status FROM pdf_extraction_jobs WHERE id = $1`,
      [pdfJobId]
    );

    if (parentJob.rows.length === 0 || parentJob.rows[0].status === 'cancelled') {
      // Mark this page job as cancelled
      await query(
        `UPDATE pdf_page_extraction_jobs
         SET status = 'cancelled', completed_at = NOW()
         WHERE pdf_job_id = $1 AND page_number = $2`,
        [pdfJobId, pageNumber]
      );

      return {
        pdfJobId,
        pageNumber,
        skipped: true,
      };
    }

    // Placeholder implementation - will be replaced in issue #228
    throw new Error(
      "ExtractRecipeFromImageJob not yet implemented. See issue #228."
    );
  }
}
