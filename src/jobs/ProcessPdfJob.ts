/**
 * ProcessPdfJob - Parent job for PDF recipe extraction
 *
 * Renders each page of a PDF to an image and spawns child jobs
 * (ExtractRecipeFromImageJob) for recipe extraction per page.
 */
import { Job, Sidequest } from "sidequest";
import { query } from "@/lib/db";
import { getPdfInfo, renderPdfPageToImage } from "@/lib/pdf-utils";

export interface ProcessPdfJobParams {
  pdfJobId: number; // ID in pdf_extraction_jobs table
  userId: number;
  pdfBase64: string; // Base64-encoded PDF data
  targetLocale: string; // e.g., 'en-US', 'de-DE'
  targetRegion: string; // e.g., 'US', 'DE'
}

export interface ProcessPdfJobResult {
  pdfJobId: number;
  totalPages: number;
  childJobsCreated: number;
}

/**
 * Job that processes a PDF file by:
 * 1. Parsing the PDF to get page count
 * 2. Rendering each page to an image
 * 3. Spawning child jobs (ExtractRecipeFromImageJob) for each page
 *
 * Queue: pdf-processing (concurrency: 1, memory-intensive)
 * Timeout: 600000ms (10 minutes)
 * Max attempts: 1 (don't retry entire PDF - each page is a separate job)
 */
export class ProcessPdfJob extends Job {
  async run(params: ProcessPdfJobParams): Promise<ProcessPdfJobResult> {
    const { pdfJobId, userId, pdfBase64, targetLocale, targetRegion } = params;

    try {
      // Update status to 'processing'
      await query(
        `UPDATE pdf_extraction_jobs
         SET status = 'processing', started_at = NOW()
         WHERE id = $1`,
        [pdfJobId]
      );

      // Parse PDF and get page count
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const pdfInfo = await getPdfInfo(pdfBuffer);

      // Update total_pages in database
      await query(
        `UPDATE pdf_extraction_jobs
         SET total_pages = $1
         WHERE id = $2`,
        [pdfInfo.pageCount, pdfJobId]
      );

      // Process each page: render to image and spawn child job
      for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
        // Render page to image (PNG at 200 DPI default)
        const imageBuffer = await renderPdfPageToImage(pdfBuffer, pageNum);
        const imageBase64 = imageBuffer.toString("base64");

        // Enqueue ExtractRecipeFromImageJob
        // Note: ExtractRecipeFromImageJob will be implemented in issue #228
        // Using dynamic import to avoid TypeScript error until it exists
        const { ExtractRecipeFromImageJob } = await import(
          "./ExtractRecipeFromImageJob"
        );

        const childJobData = await Sidequest.build(ExtractRecipeFromImageJob)
          .queue("recipe-extraction")
          .timeout(120000) // 2 minutes per page
          .maxAttempts(2)
          .enqueue({
            pdfJobId,
            pageNumber: pageNum,
            imageBase64,
            targetLocale,
            targetRegion,
            userId,
          });

        // Insert child job record
        await query(
          `INSERT INTO pdf_page_extraction_jobs
           (pdf_job_id, page_number, sidequest_job_id, status)
           VALUES ($1, $2, $3, 'pending')`,
          [pdfJobId, pageNum, String(childJobData.id)]
        );
      }

      // Mark parent job as 'pages_queued'
      await query(
        `UPDATE pdf_extraction_jobs
         SET status = 'pages_queued'
         WHERE id = $1`,
        [pdfJobId]
      );

      return {
        pdfJobId,
        totalPages: pdfInfo.pageCount,
        childJobsCreated: pdfInfo.pageCount,
      };
    } catch (error) {
      // Update job as failed
      await query(
        `UPDATE pdf_extraction_jobs
         SET status = 'failed',
             error_message = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [error instanceof Error ? error.message : "Unknown error", pdfJobId]
      );

      // Re-throw to mark SideQuest job as failed
      // When an error is thrown, SideQuest marks the job as failed (no retry since max_attempts would be 1)
      throw error instanceof Error ? error : new Error("Unknown error");
    }
  }
}
