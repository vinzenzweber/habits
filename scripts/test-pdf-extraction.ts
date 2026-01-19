/**
 * Development script for testing PDF recipe extraction pipeline
 *
 * Usage: npx tsx scripts/test-pdf-extraction.ts <path-to-pdf> [options]
 *
 * Options:
 *   --save-images  Save rendered page images to temp directory
 *   --verbose      Show detailed timing for each step
 *   --dpi=N        Set DPI for rendering (default: 150)
 *   --png          Use PNG instead of JPEG (larger files)
 *
 * Example:
 *   npx tsx scripts/test-pdf-extraction.ts ~/Downloads/recipes.pdf
 *   npx tsx scripts/test-pdf-extraction.ts ~/Downloads/recipes.pdf --save-images --verbose
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { renderPdfPageToImage, getPdfInfo } from '../src/lib/pdf-utils';
import { extractRecipeFromImage } from '../src/lib/recipe-extraction';

// Parse command line arguments
const args = process.argv.slice(2);
const pdfPath = args.find((arg) => !arg.startsWith('--'));
const saveImages = args.includes('--save-images');
const verbose = args.includes('--verbose');
const usePng = args.includes('--png');
const dpiArg = args.find((arg) => arg.startsWith('--dpi='));
const dpi = dpiArg ? parseInt(dpiArg.split('=')[1], 10) : 100;

if (!pdfPath) {
  console.error('Usage: npx tsx scripts/test-pdf-extraction.ts <path-to-pdf> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --save-images  Save rendered page images to temp directory');
  console.error('  --verbose      Show detailed timing for each step');
  console.error('  --dpi=N        Set DPI for rendering (default: 100)');
  console.error('  --png          Use PNG instead of JPEG (larger files)');
  process.exit(1);
}

// Verify PDF file exists
const resolvedPath = path.resolve(pdfPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found: ${resolvedPath}`);
  process.exit(1);
}

// Timing utilities
function timestamp(): string {
  return new Date().toISOString().substring(11, 23);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function log(message: string, indent = 0): void {
  const prefix = '  '.repeat(indent);
  console.log(`[${timestamp()}] ${prefix}${message}`);
}

interface TimingInfo {
  pdfRead: number;
  pdfInfo: number;
  pages: Array<{
    pageNumber: number;
    render: number;
    apiCall: number;
    total: number;
    imageSize: number;
  }>;
  total: number;
}

interface ExtractionResultSummary {
  pageNumber: number;
  success: boolean;
  title?: string;
  error?: string;
  imagePath?: string;
  extractedData?: object;
}

async function main() {
  const totalStart = Date.now();
  const timing: TimingInfo = {
    pdfRead: 0,
    pdfInfo: 0,
    pages: [],
    total: 0,
  };

  console.log('');
  console.log('='.repeat(70));
  log('PDF Recipe Extraction Test');
  console.log('='.repeat(70));
  log(`Input: ${resolvedPath}`);
  log(`Settings: DPI=${dpi}, Format=${usePng ? 'PNG' : 'JPEG'}`);
  console.log('');

  // Read PDF file
  const readStart = Date.now();
  const pdfBuffer = fs.readFileSync(resolvedPath);
  timing.pdfRead = Date.now() - readStart;
  log(`PDF loaded: ${(pdfBuffer.length / 1024).toFixed(2)} KB (${formatDuration(timing.pdfRead)})`);

  // Get PDF info
  let pdfInfo;
  try {
    const infoStart = Date.now();
    pdfInfo = await getPdfInfo(pdfBuffer);
    timing.pdfInfo = Date.now() - infoStart;
    log(`PDF info: ${pdfInfo.pageCount} pages (${formatDuration(timing.pdfInfo)})`);
  } catch (error) {
    log(`ERROR reading PDF: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Create temp directory for images if needed
  let tempDir: string | null = null;
  if (saveImages) {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extraction-'));
    log(`Output directory: ${tempDir}`);
  }
  console.log('');

  const results: ExtractionResultSummary[] = [];

  // Process each page
  for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
    const pageStart = Date.now();
    const pageTiming = {
      pageNumber: pageNum,
      render: 0,
      apiCall: 0,
      total: 0,
      imageSize: 0,
    };

    console.log('-'.repeat(70));
    log(`Page ${pageNum}/${pdfInfo.pageCount}`);

    const result: ExtractionResultSummary = {
      pageNumber: pageNum,
      success: false,
    };

    try {
      // Render page to image
      const renderStart = Date.now();
      log('Rendering PDF page to image...', 1);
      const imageBuffer = await renderPdfPageToImage(pdfBuffer, pageNum, {
        dpi,
        format: usePng ? 'png' : 'jpeg',
        quality: 85,
      });
      pageTiming.render = Date.now() - renderStart;
      pageTiming.imageSize = imageBuffer.length;

      const imageSizeKB = (imageBuffer.length / 1024).toFixed(2);
      const imageSizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
      log(`Image rendered: ${imageSizeKB} KB (${imageSizeMB} MB) in ${formatDuration(pageTiming.render)}`, 1);

      if (verbose) {
        // Estimate image dimensions from file size and format
        log(`Format: ${usePng ? 'PNG' : 'JPEG'}, DPI: ${dpi}`, 2);
      }

      // Save image if requested
      if (tempDir) {
        const ext = usePng ? 'png' : 'jpg';
        const imagePath = path.join(tempDir, `page-${pageNum}.${ext}`);
        fs.writeFileSync(imagePath, imageBuffer);
        result.imagePath = imagePath;
        log(`Saved: ${imagePath}`, 1);
      }

      // Extract recipe using vision API
      const apiStart = Date.now();
      log('Calling Vision API...', 1);
      const imageBase64 = imageBuffer.toString('base64');

      if (verbose) {
        const base64SizeKB = (imageBase64.length / 1024).toFixed(2);
        log(`Base64 payload: ${base64SizeKB} KB`, 2);
      }

      const extractionResult = await extractRecipeFromImage(imageBase64);
      pageTiming.apiCall = Date.now() - apiStart;
      log(`API response received in ${formatDuration(pageTiming.apiCall)}`, 1);

      if (extractionResult.success) {
        const data = extractionResult.data;
        result.success = true;
        result.title = data.title;
        result.extractedData = data;
        log(`✓ SUCCESS: "${data.title}"`, 1);
        log(`Servings: ${data.servings}, Ingredients: ${data.ingredientGroups.reduce((sum, g) => sum + g.ingredients.length, 0)}, Steps: ${data.steps.length}`, 2);
      } else {
        result.success = false;
        result.error = extractionResult.error;
        log(`✗ FAILED: ${extractionResult.error}`, 1);
      }
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      log(`✗ ERROR: ${result.error}`, 1);
    }

    pageTiming.total = Date.now() - pageStart;
    timing.pages.push(pageTiming);
    log(`Page ${pageNum} total time: ${formatDuration(pageTiming.total)}`, 1);

    results.push(result);
  }

  timing.total = Date.now() - totalStart;

  // Summary
  console.log('');
  console.log('='.repeat(70));
  log('SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log('');
  log(`Total pages: ${results.length}`);
  log(`Successful: ${successful.length}`);
  log(`Failed: ${failed.length}`);
  console.log('');

  // Timing breakdown
  log('TIMING BREAKDOWN:');
  log(`PDF read: ${formatDuration(timing.pdfRead)}`, 1);
  log(`PDF info: ${formatDuration(timing.pdfInfo)}`, 1);
  for (const pt of timing.pages) {
    log(`Page ${pt.pageNumber}:`, 1);
    log(`Render: ${formatDuration(pt.render)} (${(pt.imageSize / 1024).toFixed(0)} KB)`, 2);
    log(`API call: ${formatDuration(pt.apiCall)}`, 2);
    log(`Total: ${formatDuration(pt.total)}`, 2);
  }
  log(`TOTAL: ${formatDuration(timing.total)}`, 1);
  console.log('');

  // Average per page
  if (timing.pages.length > 0) {
    const avgRender = timing.pages.reduce((s, p) => s + p.render, 0) / timing.pages.length;
    const avgApi = timing.pages.reduce((s, p) => s + p.apiCall, 0) / timing.pages.length;
    const avgTotal = timing.pages.reduce((s, p) => s + p.total, 0) / timing.pages.length;
    const avgSize = timing.pages.reduce((s, p) => s + p.imageSize, 0) / timing.pages.length;

    log('AVERAGES PER PAGE:');
    log(`Render: ${formatDuration(avgRender)}`, 1);
    log(`API call: ${formatDuration(avgApi)}`, 1);
    log(`Total: ${formatDuration(avgTotal)}`, 1);
    log(`Image size: ${(avgSize / 1024).toFixed(0)} KB`, 1);
    console.log('');
  }

  if (successful.length > 0) {
    log('Extracted recipes:');
    for (const result of successful) {
      log(`Page ${result.pageNumber}: "${result.title}"`, 1);
    }
    console.log('');
  }

  if (failed.length > 0) {
    log('Failed pages:');
    for (const result of failed) {
      log(`Page ${result.pageNumber}: ${result.error}`, 1);
    }
    console.log('');
  }

  // Output full JSON for successful extractions
  if (successful.length > 0 && verbose) {
    console.log('='.repeat(70));
    log('EXTRACTED DATA (JSON)');
    console.log('='.repeat(70));
    for (const result of successful) {
      console.log(`\n--- Page ${result.pageNumber}: ${result.title} ---\n`);
      console.log(JSON.stringify(result.extractedData, null, 2));
    }
  }

  if (tempDir) {
    console.log('');
    log(`Images saved to: ${tempDir}`);
  }

  console.log('');
  log(`Done in ${formatDuration(timing.total)}`);
}

main().catch((error) => {
  console.error(`[${timestamp()}] Fatal error:`, error);
  process.exit(1);
});
