/**
 * ProcessPdfJob - Parent job for PDF recipe extraction
 *
 * Renders each page of a PDF to an image and spawns child jobs
 * (ExtractRecipeFromImageJob) for recipe extraction per page.
 */
import { Job, Sidequest } from "@/lib/sidequest-runtime";
import { getPdfInfo, renderPdfPageToImage } from "@/lib/pdf-utils";

export interface ProcessPdfJobParams {
  userId: number;
  pdfBase64: string; // Base64-encoded PDF data
  targetLocale: string; // e.g., 'en-US', 'de-DE'
  targetRegion: string; // e.g., 'US', 'DE'
  totalPages: number; // Stored on the parent Sidequest job args for polling
}

export interface ProcessPdfJobResult {
  parentJobId: number;
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
    const { userId, pdfBase64, targetLocale, targetRegion } = params;

    try {
      // Parse PDF and get page count
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const pdfInfo = await getPdfInfo(pdfBuffer);

      const { ExtractRecipeFromImageJob } = await import(
        "./ExtractRecipeFromImageJob"
      );

      // Process each page: render to image and spawn child job
      for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
        // Render page to image (PNG at 200 DPI default)
        const imageBuffer = await renderPdfPageToImage(pdfBuffer, pageNum);
        const imageBase64 = imageBuffer.toString("base64");

        // Enqueue ExtractRecipeFromImageJob
        await Sidequest.build(ExtractRecipeFromImageJob)
          .queue("recipe-extraction")
          .timeout(120000) // 2 minutes per page
          .maxAttempts(2)
          .enqueue({
            parentJobId: this.id,
            pageNumber: pageNum,
            imageBase64,
            targetLocale,
            targetRegion,
            userId,
          });
      }

      return {
        parentJobId: this.id,
        totalPages: pdfInfo.pageCount,
        childJobsCreated: pdfInfo.pageCount,
      };
    } catch (error) {
      // Re-throw to mark SideQuest job as failed
      throw error instanceof Error ? error : new Error("Unknown error");
    }
  }
}
