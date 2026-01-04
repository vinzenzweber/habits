import { NextRequest } from 'next/server';
import { processImageGenerationJob, processBatchJobs } from '@/lib/image-generation';
import { getJobStats, retryFailedJobs, resetStuckJobs } from '@/lib/job-queue';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for image generation

/**
 * Validate admin API token
 */
function validateToken(request: NextRequest): boolean {
  const expectedToken = process.env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    console.warn('ADMIN_API_TOKEN not configured');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${expectedToken}`;
}

/**
 * POST /api/admin/process-images
 * Process pending image generation jobs
 * Called by cron job or external scheduler
 */
export async function POST(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse request body for options
    let maxJobs = 1;
    let resetStuck = false;
    let retryFailed = false;

    try {
      const body = await request.json();
      maxJobs = body.maxJobs ?? 1;
      resetStuck = body.resetStuck ?? false;
      retryFailed = body.retryFailed ?? false;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Optionally reset stuck jobs first
    let stuckReset = 0;
    if (resetStuck) {
      stuckReset = await resetStuckJobs(10); // 10 minutes threshold
    }

    // Optionally retry failed jobs
    let failedRetried = 0;
    if (retryFailed) {
      failedRetried = await retryFailedJobs(3); // max 3 attempts
    }

    // Process jobs
    const processed = await processBatchJobs(maxJobs);

    // Get current stats
    const stats = await getJobStats();

    return Response.json({
      success: true,
      jobsProcessed: processed,
      stuckJobsReset: stuckReset,
      failedJobsRetried: failedRetried,
      stats
    });

  } catch (error) {
    console.error('Process images error:', error);
    return Response.json({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/process-images
 * Get job queue statistics
 */
export async function GET(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getJobStats();

    return Response.json({
      stats,
      hasWork: stats.pending > 0 || stats.processing > 0
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return Response.json({
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
