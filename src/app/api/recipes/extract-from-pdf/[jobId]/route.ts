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
interface SidequestJobRow {
  id: number;
  state: string;
  result: {
    parentJobId?: number;
    pageNumber?: number;
    recipeSlug?: string;
    recipeTitle?: string;
    skipped?: boolean;
  } | null;
  args: Array<{
    parentJobId?: number;
    pageNumber?: number;
  }>;
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

    const { configureSidequest } = await import('@/lib/sidequest-config');
    const { Sidequest } = await import('@/lib/sidequest-runtime');
    await configureSidequest();

    const parentJob = await Sidequest.job.get(jobIdNum);
    if (!parentJob) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const parentArgs = Array.isArray(parentJob.args)
      ? (parentJob.args[0] as { userId?: number; totalPages?: number })
      : null;
    if (!parentArgs || parentArgs.userId !== userIdNum) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const totalPages = parentArgs.totalPages ?? 0;

    const childJobsResult = await query(
      `SELECT id, state, result, args
       FROM sidequest_jobs
       WHERE class = $1 AND args->0->>'parentJobId' = $2
       ORDER BY id ASC`,
      ['ExtractRecipeFromImageJob', String(jobIdNum)]
    );

    const childJobs = childJobsResult.rows as SidequestJobRow[];
    const terminalStates = new Set(['completed', 'failed', 'canceled']);
    const completedJobs = childJobs.filter((job) => terminalStates.has(job.state));
    const failedJobs = childJobs.filter((job) => job.state === 'failed');

    const recipes: ExtractedRecipe[] = childJobs
      .filter((job) => job.state === 'completed' && job.result?.recipeSlug)
      .map((job) => ({
        slug: job.result!.recipeSlug!,
        title: job.result!.recipeTitle ?? 'Untitled recipe',
        pageNumber: job.result!.pageNumber ?? 0,
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber);

    const skippedPages = childJobs
      .filter((job) => job.result?.skipped && job.result?.pageNumber)
      .map((job) => job.result!.pageNumber!)
      .sort((a, b) => a - b);

    let status: JobStatusResponse['status'] = 'pending';
    let errorMessage: string | null = null;

    if (parentJob.state === 'failed') {
      status = 'failed';
      errorMessage = parentJob.errors?.[0]?.message ?? 'Job failed';
    } else if (parentJob.state === 'canceled') {
      status = 'cancelled';
    } else if (parentJob.state === 'completed') {
      if (failedJobs.length > 0) {
        status = 'failed';
        errorMessage = 'One or more pages failed to process';
      } else if (completedJobs.length >= totalPages && totalPages > 0) {
        status = 'completed';
      } else if (totalPages === 0) {
        status = 'completed';
      } else {
        status = 'pages_queued';
      }
    } else if (parentJob.state === 'running' || parentJob.state === 'claimed') {
      status = 'processing';
    } else {
      status = 'pending';
    }

    const response: JobStatusResponse = {
      jobId: parentJob.id,
      status,
      progress: {
        currentPage: completedJobs.length,
        totalPages,
        recipesExtracted: recipes.length,
      },
      recipes,
      skippedPages,
      error: errorMessage,
      createdAt: parentJob.inserted_at?.toISOString?.() ?? new Date().toISOString(),
      completedAt: parentJob.completed_at?.toISOString?.() ?? null,
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

    const { configureSidequest } = await import('@/lib/sidequest-config');
    const { Sidequest } = await import('@/lib/sidequest-runtime');
    await configureSidequest();

    const parentJob = await Sidequest.job.get(jobIdNum);
    if (!parentJob) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const parentArgs = Array.isArray(parentJob.args)
      ? (parentJob.args[0] as { userId?: number })
      : null;
    if (!parentArgs || parentArgs.userId !== userIdNum) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // 3. Check if job is already finished
    if (parentJob.state === 'completed' || parentJob.state === 'failed' || parentJob.state === 'canceled') {
      return Response.json(
        { error: `Cannot cancel job: job is already ${parentJob.state}` },
        { status: 400 }
      );
    }

    await Sidequest.job.cancel(jobIdNum);

    const childJobsResult = await query(
      `SELECT id
       FROM sidequest_jobs
       WHERE class = $1
         AND args->0->>'parentJobId' = $2
         AND state IN ('waiting', 'claimed', 'running')`,
      ['ExtractRecipeFromImageJob', String(jobIdNum)]
    );

    await Promise.all(
      childJobsResult.rows.map((row) => Sidequest.job.cancel(row.id))
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
