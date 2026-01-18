/**
 * PDF utilities for recipe extraction
 * Handles PDF parsing, text extraction, and page-to-image conversion
 */

// pdf-parse uses CommonJS exports, so we import it this way
import * as pdfParse from 'pdf-parse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdf = (pdfParse as any).default || pdfParse;

// Constants
export const MAX_PDF_SIZE_MB = 10;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
export const MAX_PDF_PAGES = 50;

// Minimum text length to consider a page as text-based (vs image-based)
export const MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION = 200;

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
}

export interface PdfPageInfo {
  pageNumber: number;
  textContent: string;
  hasSignificantText: boolean;
}

export interface PdfInfo {
  pageCount: number;
  totalText: string;
  pages: PdfPageInfo[];
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
 * Extract text content from PDF buffer
 */
export async function extractPdfText(pdfBuffer: Buffer): Promise<PdfInfo> {
  const data = await pdf(pdfBuffer);

  if (data.numpages > MAX_PDF_PAGES) {
    throw new Error(`PDF has too many pages (${data.numpages}). Maximum: ${MAX_PDF_PAGES}`);
  }

  // pdf-parse returns combined text from all pages
  // For per-page content, we'll need to use pdfjs-dist
  return {
    pageCount: data.numpages,
    totalText: data.text,
    pages: [], // Will be populated by extractPdfPagesText
  };
}

/**
 * Extract text from each page of a PDF using pdfjs-dist
 */
export async function extractPdfPagesText(pdfBuffer: Buffer): Promise<PdfInfo> {
  // Import worker module first to populate globalThis.pdfjsWorker
  // This is required for server-side usage where Worker threads aren't available
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Load the PDF - convert Buffer to Uint8Array for pdfjs-dist compatibility
  const pdfData = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;

  if (pdfDoc.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDF has too many pages (${pdfDoc.numPages}). Maximum: ${MAX_PDF_PAGES}`);
  }

  const pages: PdfPageInfo[] = [];
  let totalText = '';

  // Extract text from each page
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      })
      .join(' ')
      .trim();

    pages.push({
      pageNumber: pageNum,
      textContent: pageText,
      hasSignificantText: pageText.length >= MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION,
    });

    totalText += pageText + '\n\n';
  }

  return {
    pageCount: pdfDoc.numPages,
    totalText: totalText.trim(),
    pages,
  };
}

/**
 * Extract text from a specific PDF page
 */
export async function extractPageText(
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<string> {
  // Import worker module first to populate globalThis.pdfjsWorker
  // This is required for server-side usage where Worker threads aren't available
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Convert Buffer to Uint8Array for pdfjs-dist compatibility
  const pdfData = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;

  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
    throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pdfDoc.numPages} pages.`);
  }

  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();

  return textContent.items
    .map((item) => {
      if ('str' in item) {
        return item.str;
      }
      return '';
    })
    .join(' ')
    .trim();
}

/**
 * Check if a PDF is password-protected
 */
export async function isPdfPasswordProtected(pdfBuffer: Buffer): Promise<boolean> {
  try {
    const data = await pdf(pdfBuffer);
    // If we can read the PDF, it's not password-protected
    return data.numpages === 0 && data.text === '';
  } catch (error) {
    if (error instanceof Error && error.message.includes('password')) {
      return true;
    }
    throw error;
  }
}

/**
 * Get page count from a PDF buffer
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const data = await pdf(pdfBuffer);
  return data.numpages;
}

// Default DPI for rendering PDF pages to images
// 200 DPI provides good quality for vision API (~1700px for standard pages)
export const DEFAULT_PDF_RENDER_DPI = 200;

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

/**
 * Get basic PDF info (page count) without full text extraction
 * Useful when we're going to use vision API anyway
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
