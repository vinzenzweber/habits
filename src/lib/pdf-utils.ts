/**
 * PDF utilities for recipe extraction
 *
 * PDF extraction uses a unified Vision API approach:
 * 1. Render each PDF page to a high-resolution PNG image using pdftoppm
 * 2. Send the image to GPT-4o Vision API for recipe extraction
 *
 * This approach works consistently for both text-based and scanned/image-based PDFs,
 * and uses the same code path as image uploads from the camera.
 */

// Constants
export const MAX_PDF_SIZE_MB = 10;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
export const MAX_PDF_PAGES = 50;

// Default DPI for rendering PDF pages to images
// 200 DPI provides good quality for vision API (~1700px for standard pages)
export const DEFAULT_PDF_RENDER_DPI = 200;

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a PDF file before processing
 */
export function validatePdfFile(file: File): PdfValidationResult {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Invalid file type. Expected PDF.' };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return { valid: false, error: `PDF too large. Maximum size: ${MAX_PDF_SIZE_MB}MB` };
  }

  return { valid: true };
}

/**
 * Validate PDF size from base64 string
 */
export function validatePdfBase64Size(base64: string): PdfValidationResult {
  // Base64 is ~33% larger than binary, so calculate approximate size
  const approximateBytes = Math.ceil(base64.length * 0.75);

  if (approximateBytes > MAX_PDF_SIZE_BYTES) {
    return { valid: false, error: `PDF too large. Maximum size: ${MAX_PDF_SIZE_MB}MB` };
  }

  return { valid: true };
}

/**
 * Get basic PDF info (page count) using pdfjs-dist
 *
 * This is a lightweight operation that only reads PDF metadata.
 */
export async function getPdfInfo(pdfBuffer: Buffer): Promise<{ pageCount: number }> {
  // Import worker module first to populate globalThis.pdfjsWorker
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const pdfData = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;

  if (pdfDoc.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDF has too many pages (${pdfDoc.numPages}). Maximum: ${MAX_PDF_PAGES}`);
  }

  return {
    pageCount: pdfDoc.numPages,
  };
}

/**
 * Render a PDF page to a high-resolution PNG image using pdftoppm
 *
 * Uses the poppler-utils pdftoppm tool for reliable rendering of both
 * text-based and image-based (scanned) PDFs.
 *
 * @param pdfBuffer - The PDF file as a Buffer
 * @param pageNumber - Page number to render (1-indexed)
 * @param dpi - DPI for rendering (default 200 for good quality)
 * @returns PNG image as a Buffer
 */
export async function renderPdfPageToImage(
  pdfBuffer: Buffer,
  pageNumber: number,
  dpi: number = DEFAULT_PDF_RENDER_DPI
): Promise<Buffer> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const { writeFileSync, readFileSync, unlinkSync, mkdtempSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const execFileAsync = promisify(execFile);

  // Create temp directory for PDF and output
  const tempDir = mkdtempSync(join(tmpdir(), 'pdf-render-'));
  const pdfPath = join(tempDir, 'input.pdf');
  const outputPrefix = join(tempDir, 'page');

  try {
    // Write PDF to temp file
    writeFileSync(pdfPath, pdfBuffer);

    // Use pdftoppm to convert specific page to PNG
    // -f and -l specify first and last page (same value for single page)
    // -png outputs PNG format
    // -r specifies DPI
    await execFileAsync('pdftoppm', [
      '-f', String(pageNumber),
      '-l', String(pageNumber),
      '-png',
      '-r', String(dpi),
      pdfPath,
      outputPrefix,
    ]);

    // pdftoppm outputs files like page-1.png, page-01.png depending on page count
    // Check both formats
    const possibleOutputs = [
      `${outputPrefix}-${pageNumber}.png`,
      `${outputPrefix}-${String(pageNumber).padStart(2, '0')}.png`,
      `${outputPrefix}-${String(pageNumber).padStart(3, '0')}.png`,
    ];

    for (const outputPath of possibleOutputs) {
      try {
        const imageBuffer = readFileSync(outputPath);
        return imageBuffer;
      } catch {
        // Try next format
      }
    }

    throw new Error(`Failed to find rendered image for page ${pageNumber}`);
  } finally {
    // Cleanup temp files
    try {
      const { readdirSync } = await import('fs');
      const files = readdirSync(tempDir);
      for (const file of files) {
        unlinkSync(join(tempDir, file));
      }
      const { rmdirSync } = await import('fs');
      rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}
