/**
 * ProcessPdfJob - Parent job for PDF recipe extraction
 *
 * Renders each page of a PDF to an image and spawns child jobs
 * (ExtractRecipeFromImageJob) for recipe extraction per page.
 */
import { readFile, rm } from "fs/promises";
import { dirname, resolve } from "path";
import { tmpdir } from "os";
import { Job, Sidequest } from "@/lib/sidequest-runtime";
import { getPdfInfo, renderPdfPageToImage } from "@/lib/pdf-utils";

export interface ProcessPdfJobParams {
  userId: number;
  pdfPath: string; // Temp file path for PDF data
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
    const { userId, pdfPath, targetLocale, targetRegion, totalPages } = params;
    let pdfBuffer: Buffer | null = null;
    let pageCount = totalPages;

    try {
      // Parse PDF and get page count
      pdfBuffer = await readFile(pdfPath);
      if (!pageCount || pageCount <= 0) {
        const pdfInfo = await getPdfInfo(pdfBuffer);
        pageCount = pdfInfo.pageCount;
      }

      const { ExtractRecipeFromImageJob } = await import(
        "./ExtractRecipeFromImageJob"
      );

      // Process each page: render to image and spawn child job
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
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
        totalPages: pageCount,
        childJobsCreated: pageCount,
      };
    } catch (error) {
      // Re-throw to mark SideQuest job as failed
      throw error instanceof Error ? error : new Error("Unknown error");
    } finally {
      await cleanupTempPdf(pdfPath);
    }
  }
}

async function cleanupTempPdf(pdfPath: string) {
  try {
    const resolvedDir = resolve(dirname(pdfPath));
    const resolvedTmp = resolve(tmpdir());
    if (!resolvedDir.startsWith(`${resolvedTmp}/`)) {
      return;
    }
    await rm(resolvedDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup only.
  }
}
