/**
 * Development script for testing PDF recipe extraction pipeline
 *
 * Usage: npx tsx scripts/test-pdf-extraction.ts <path-to-pdf> [--save-images]
 *
 * Features:
 * - Renders PDF pages to high-res images
 * - Calls vision API to extract recipes
 * - Outputs extracted JSON for inspection
 * - Optionally saves rendered images to temp directory for debugging
 *
 * Example:
 *   npx tsx scripts/test-pdf-extraction.ts ~/Downloads/recipes.pdf
 *   npx tsx scripts/test-pdf-extraction.ts ~/Downloads/recipes.pdf --save-images
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

if (!pdfPath) {
  console.error('Usage: npx tsx scripts/test-pdf-extraction.ts <path-to-pdf> [--save-images]');
  console.error('');
  console.error('Options:');
  console.error('  --save-images  Save rendered page images to temp directory');
  process.exit(1);
}

// Verify PDF file exists
const resolvedPath = path.resolve(pdfPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found: ${resolvedPath}`);
  process.exit(1);
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
  console.log('='.repeat(60));
  console.log('PDF Recipe Extraction Test');
  console.log('='.repeat(60));
  console.log(`Input: ${resolvedPath}`);
  console.log('');

  // Read PDF file
  const pdfBuffer = fs.readFileSync(resolvedPath);
  console.log(`PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

  // Get PDF info
  let pdfInfo;
  try {
    pdfInfo = await getPdfInfo(pdfBuffer);
    console.log(`Page count: ${pdfInfo.pageCount}`);
  } catch (error) {
    console.error(`Error reading PDF: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Create temp directory for images if needed
  let tempDir: string | null = null;
  if (saveImages) {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extraction-'));
    console.log(`Saving images to: ${tempDir}`);
  }
  console.log('');

  const results: ExtractionResultSummary[] = [];

  // Process each page
  for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
    console.log('-'.repeat(60));
    console.log(`Processing page ${pageNum}/${pdfInfo.pageCount}...`);

    const result: ExtractionResultSummary = {
      pageNumber: pageNum,
      success: false,
    };

    try {
      // Render page to image
      console.log('  Rendering page to image...');
      const imageBuffer = await renderPdfPageToImage(pdfBuffer, pageNum);
      console.log(`  Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

      // Save image if requested
      if (tempDir) {
        const imagePath = path.join(tempDir, `page-${pageNum}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        result.imagePath = imagePath;
        console.log(`  Saved: ${imagePath}`);
      }

      // Extract recipe using vision API
      console.log('  Calling vision API...');
      const imageBase64 = imageBuffer.toString('base64');
      const extractionResult = await extractRecipeFromImage(imageBase64);

      if (extractionResult.success) {
        const data = extractionResult.data;
        result.success = true;
        result.title = data.title;
        result.extractedData = data;
        console.log(`  SUCCESS: "${data.title}"`);
        console.log(`  - Servings: ${data.servings}`);
        console.log(`  - Ingredients: ${data.ingredientGroups.reduce((sum, g) => sum + g.ingredients.length, 0)}`);
        console.log(`  - Steps: ${data.steps.length}`);
        console.log(`  - Locale: ${data.locale}`);
      } else {
        const errorMsg = extractionResult.error;
        result.success = false;
        result.error = errorMsg;
        console.log(`  FAILED: ${errorMsg}`);
      }
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`  ERROR: ${result.error}`);
    }

    results.push(result);
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`Total pages: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('');

  if (successful.length > 0) {
    console.log('Extracted recipes:');
    for (const result of successful) {
      console.log(`  Page ${result.pageNumber}: "${result.title}"`);
    }
    console.log('');
  }

  if (failed.length > 0) {
    console.log('Failed pages:');
    for (const result of failed) {
      console.log(`  Page ${result.pageNumber}: ${result.error}`);
    }
    console.log('');
  }

  // Output full JSON for successful extractions
  if (successful.length > 0) {
    console.log('='.repeat(60));
    console.log('EXTRACTED DATA (JSON)');
    console.log('='.repeat(60));
    for (const result of successful) {
      console.log(`\n--- Page ${result.pageNumber}: ${result.title} ---\n`);
      console.log(JSON.stringify(result.extractedData, null, 2));
    }
  }

  if (tempDir) {
    console.log('');
    console.log(`Images saved to: ${tempDir}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
