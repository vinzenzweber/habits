/**
 * GET /api/recipes/extract-from-pdf/[jobId]
 * Poll PDF extraction job status and progress
 *
 * Response:
 *   - Success: HTTP 200 { jobId, status, progress, recipes, skippedPages, error, createdAt, completedAt }
 *   - Error: { error: string }
 *
 * DELETE /api/recipes/extract-from-pdf/[jobId]
 * Cancel a PDF extraction job (best-effort cancellation)
 *
 * Response:
 *   - Success: HTTP 200 { success: true }
 *   - Error: { error: string }
 */

import { auth } from '@/lib/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ jobId: string }> };

// Type definitions
interface PdfExtractionJobRow {
  id: number;
  user_id: number;
  total_pages: number | null;
  pages_processed: number;
  recipes_extracted: number;
  status: 'pending' | 'processing' | 'pages_queued' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

interface PageJobRow {
  recipe_slug: string;
  recipe_title: string;
  page_number: number;
}

interface SkippedPageRow {
  page_number: number;
}

interface ExtractedRecipe {
  slug: string;
  title: string;
  pageNumber: number;
}

interface JobStatusResponse {
  jobId: number;
  status: string;
  progress: {
    currentPage: number;
    totalPages: number;
    recipesExtracted: number;
  };
  recipes: ExtractedRecipe[];
  skippedPages: number[];
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export async function GET(request: Request, { params }: RouteParams) {
  // 1. Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { jobId } = await params;
    const jobIdNum = parseInt(jobId, 10);
    const userIdNum = parseInt(session.user.id, 10);

    // Validate jobId is a number
    if (isNaN(jobIdNum)) {
      return Response.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // 2. Query parent job with ownership check
    const jobResult = await query(
      `SELECT id, user_id, total_pages, pages_processed, recipes_extracted,
              status, error_message, created_at, completed_at
       FROM pdf_extraction_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobIdNum, userIdNum]
    );

    if (jobResult.rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobResult.rows[0] as PdfExtractionJobRow;

    // 3. Query completed recipes and skipped pages in parallel
    const [recipesResult, skippedResult] = await Promise.all([
      query(
        `SELECT recipe_slug, recipe_title, page_number
         FROM pdf_page_extraction_jobs
         WHERE pdf_job_id = $1 AND status = 'completed'
         ORDER BY page_number ASC`,
        [jobIdNum]
      ),
      query(
        `SELECT page_number
         FROM pdf_page_extraction_jobs
         WHERE pdf_job_id = $1 AND status = 'skipped'
         ORDER BY page_number ASC`,
        [jobIdNum]
      ),
    ]);

    // 4. Build response
    const recipes: ExtractedRecipe[] = (recipesResult.rows as PageJobRow[]).map((row) => ({
      slug: row.recipe_slug,
      title: row.recipe_title,
      pageNumber: row.page_number,
    }));

    const skippedPages: number[] = (skippedResult.rows as SkippedPageRow[]).map((row) => row.page_number);

    const response: JobStatusResponse = {
      jobId: job.id,
      status: job.status,
      progress: {
        currentPage: job.pages_processed,
        totalPages: job.total_pages ?? 0,
        recipesExtracted: job.recipes_extracted,
      },
      recipes,
      skippedPages,
      error: job.error_message,
      createdAt: job.created_at.toISOString(),
      completedAt: job.completed_at?.toISOString() ?? null,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return Response.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  // 1. Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { jobId } = await params;
    const jobIdNum = parseInt(jobId, 10);
    const userIdNum = parseInt(session.user.id, 10);

    // Validate jobId is a number
    if (isNaN(jobIdNum)) {
      return Response.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // 2. Query job with ownership check
    const jobResult = await query(
      `SELECT id, status, sidequest_job_id
       FROM pdf_extraction_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobIdNum, userIdNum]
    );

    if (jobResult.rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobResult.rows[0] as { id: number; status: string; sidequest_job_id: string | null };

    // 3. Check if job is already finished
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return Response.json(
        { error: `Cannot cancel job: job is already ${job.status}` },
        { status: 400 }
      );
    }

    // 4. Update job status to 'cancelled'
    await query(
      `UPDATE pdf_extraction_jobs
       SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1`,
      [jobIdNum]
    );

    // 5. Also skip any pending child page jobs (use 'skipped' per DB constraint)
    await query(
      `UPDATE pdf_page_extraction_jobs
       SET status = 'skipped', completed_at = NOW()
       WHERE pdf_job_id = $1 AND status = 'pending'`,
      [jobIdNum]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return Response.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
