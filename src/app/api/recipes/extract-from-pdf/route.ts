/**
 * POST /api/recipes/extract-from-pdf
 * Extract recipes from a PDF file (handles multi-page PDFs)
 *
 * Request body:
 *   - pdfBase64: Base64-encoded PDF data
 *
 * Response:
 *   - Success: { recipes: Array<{slug, title, pageNumber}>, totalPages, extractedCount, skippedPages }
 *   - Error: { error: string }
 */

import { auth } from '@/lib/auth';
import {
  extractRecipeFromText,
  toRecipeJson,
} from '@/lib/recipe-extraction';
import { createRecipe, getUniqueSlug } from '@/lib/recipes';
import { generateSlug } from '@/lib/recipe-types';
import { getRegionFromTimezone } from '@/lib/user-preferences';
import {
  extractPdfPagesText,
  MAX_PDF_PAGES,
  MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION,
} from '@/lib/pdf-utils';

export const runtime = 'nodejs';

// Maximum base64 PDF size (approximately 15MB after base64 encoding of 10MB file)
const MAX_BASE64_SIZE = 15 * 1024 * 1024;

interface ExtractedRecipeResult {
  slug: string;
  title: string;
  pageNumber: number;
}

interface ExtractionResponse {
  recipes: ExtractedRecipeResult[];
  totalPages: number;
  extractedCount: number;
  skippedPages: number[];
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pdfBase64 } = body;

    // Validate input
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return Response.json({ error: 'No PDF data provided' }, { status: 400 });
    }

    if (pdfBase64.length > MAX_BASE64_SIZE) {
      return Response.json(
        { error: 'PDF too large. Please use a smaller file.' },
        { status: 400 }
      );
    }

    // Get user preferences
    const recipeLocale =
      session.user.defaultRecipeLocale || session.user.locale || 'en-US';
    const userRegionTimezone =
      session.user.userRegionTimezone || session.user.timezone || 'UTC';
    const userRegion = getRegionFromTimezone(userRegionTimezone);

    const userId = session.user.id;
    const userIdNum = parseInt(userId, 10);

    // Parse PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    let pdfInfo;
    try {
      pdfInfo = await extractPdfPagesText(pdfBuffer);
    } catch (error) {
      // Handle password-protected PDFs
      if (error instanceof Error && error.message.includes('password')) {
        return Response.json(
          { error: 'This PDF is password-protected. Please provide an unprotected PDF.' },
          { status: 400 }
        );
      }
      throw error;
    }

    if (pdfInfo.pageCount > MAX_PDF_PAGES) {
      return Response.json(
        { error: `PDF has too many pages (${pdfInfo.pageCount}). Maximum: ${MAX_PDF_PAGES}` },
        { status: 400 }
      );
    }

    const recipes: ExtractedRecipeResult[] = [];
    const skippedPages: number[] = [];

    // Process each page
    for (const page of pdfInfo.pages) {
      try {
        // Skip pages with insufficient text content
        if (!page.hasSignificantText) {
          // Page doesn't have enough text - likely an image-based page or TOC
          // For now, we skip these pages (future: could render to image and use vision API)
          skippedPages.push(page.pageNumber);
          continue;
        }

        // Use text-based extraction for text-heavy pages
        const extractionResult = await extractRecipeFromText(page.textContent, {
          targetLocale: recipeLocale,
          targetRegion: userRegion,
        });

        if (!extractionResult.success) {
          skippedPages.push(page.pageNumber);
          continue;
        }

        // Save extracted recipe
        const extractedData = extractionResult.data;
        const baseSlug = generateSlug(extractedData.title);
        const slug = await getUniqueSlug(userIdNum, baseSlug);

        // Build and save recipe (no image for text-based extraction)
        const recipeJson = toRecipeJson(extractedData, slug);

        await createRecipe({
          title: extractedData.title,
          description: extractedData.description,
          locale: extractedData.locale,
          tags: extractedData.tags,
          recipeJson,
        });

        recipes.push({
          slug,
          title: extractedData.title,
          pageNumber: page.pageNumber,
        });
      } catch (pageError) {
        console.error(`Error processing page ${page.pageNumber}:`, pageError);
        skippedPages.push(page.pageNumber);
      }
    }

    // If no recipes were extracted but we have pages with text, try extracting from combined text
    if (recipes.length === 0 && pdfInfo.totalText.length >= MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION) {
      try {
        const extractionResult = await extractRecipeFromText(pdfInfo.totalText, {
          targetLocale: recipeLocale,
          targetRegion: userRegion,
        });

        if (extractionResult.success) {
          const extractedData = extractionResult.data;
          const baseSlug = generateSlug(extractedData.title);
          const slug = await getUniqueSlug(userIdNum, baseSlug);

          const recipeJson = toRecipeJson(extractedData, slug);

          await createRecipe({
            title: extractedData.title,
            description: extractedData.description,
            locale: extractedData.locale,
            tags: extractedData.tags,
            recipeJson,
          });

          recipes.push({
            slug,
            title: extractedData.title,
            pageNumber: 0, // Indicates combined extraction
          });
        }
      } catch (error) {
        console.error('Error extracting from combined text:', error);
      }
    }

    const response: ExtractionResponse = {
      recipes,
      totalPages: pdfInfo.pageCount,
      extractedCount: recipes.length,
      skippedPages,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error('Error extracting recipes from PDF:', error);

    return Response.json(
      { error: 'Failed to process PDF. Please try again.' },
      { status: 500 }
    );
  }
}
