/**
 * POST /api/recipes/extract-from-pdf
 * Extract recipes from a PDF file using vision API
 *
 * Always renders PDF pages to images and uses GPT-4 Vision for extraction.
 * This approach handles both text-based and image-based (scanned) PDFs consistently.
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
  extractRecipeFromImage,
  toRecipeJson,
} from '@/lib/recipe-extraction';
import { createRecipe, getUniqueSlug } from '@/lib/recipes';
import { generateSlug } from '@/lib/recipe-types';
import { getRegionFromTimezone } from '@/lib/user-preferences';
import {
  getPdfInfo,
  renderPdfPageToImage,
  MAX_PDF_PAGES,
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
      pdfInfo = await getPdfInfo(pdfBuffer);
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

    // Process each page: render to image and use vision API
    for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
      try {
        // Render page to high-res image
        const imageBuffer = await renderPdfPageToImage(pdfBuffer, pageNum);
        const imageBase64 = imageBuffer.toString('base64');

        // Extract recipe using vision API
        const extractionResult = await extractRecipeFromImage(imageBase64, {
          targetLocale: recipeLocale,
          targetRegion: userRegion,
        });

        if (!extractionResult.success) {
          skippedPages.push(pageNum);
          continue;
        }

        // Save extracted recipe
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
          pageNumber: pageNum,
        });
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        skippedPages.push(pageNum);
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
