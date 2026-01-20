/**
 * POST /api/recipes/extract-from-pdf
 * Enqueue PDF for background recipe extraction
 *
 * Request body:
 *   - pdfBase64: Base64-encoded PDF data
 *
 * Response:
 *   - Success: HTTP 202 { jobId: number }
 *   - Error: { error: string }
 */

import { auth } from '@/lib/auth';
import { getRegionFromTimezone } from '@/lib/user-preferences';
import { getPdfInfo, MAX_PDF_PAGES } from '@/lib/pdf-utils';
import { configureSidequest } from '@/lib/sidequest-config';
import { Sidequest } from '@/lib/sidequest-runtime';

export const runtime = 'nodejs';

// Maximum base64 PDF size (approximately 15MB after base64 encoding of 10MB file)
const MAX_BASE64_SIZE = 15 * 1024 * 1024;

interface EnqueuedJobResponse {
  jobId: number;
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

    await configureSidequest();

    const { ProcessPdfJob } = await import('@/jobs/ProcessPdfJob');

    // Enqueue ProcessPdfJob with SideQuest
    const sidequestJob = await Sidequest.build(ProcessPdfJob)
      .queue('pdf-processing')
      .timeout(600000) // 10 minutes
      .maxAttempts(1) // Don't retry entire PDF
      .enqueue({
        userId: userIdNum,
        pdfBase64,
        targetLocale: recipeLocale,
        targetRegion: userRegion,
        totalPages: pdfInfo.pageCount,
      });

    // Return HTTP 202 Accepted with job ID
    const response: EnqueuedJobResponse = { jobId: Number(sidequestJob.id) };
    return Response.json(response, { status: 202 });
  } catch (error) {
    console.error('Error enqueueing PDF extraction job:', error);

    return Response.json(
      { error: 'Failed to enqueue PDF processing. Please try again.' },
      { status: 500 }
    );
  }
}
