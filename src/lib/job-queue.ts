import { query } from './db';

export interface ImageGenerationJob {
  id: number;
  exerciseId: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  priority: number;
  attempts: number;
  lastError?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface JobStats {
  pending: number;
  processing: number;
  complete: number;
  failed: number;
}

/**
 * Queue a new image generation job for an exercise
 * Returns existing job ID if one already exists for the exercise
 */
export async function queueImageGeneration(
  exerciseId: number,
  priority: number = 0
): Promise<number> {
  // Check if a pending or processing job already exists for this exercise
  const existing = await query(
    `SELECT id FROM image_generation_jobs
     WHERE exercise_id = $1 AND status IN ('pending', 'processing')`,
    [exerciseId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new job
  const result = await query(
    `INSERT INTO image_generation_jobs (exercise_id, priority)
     VALUES ($1, $2)
     RETURNING id`,
    [exerciseId, priority]
  );

  return result.rows[0].id;
}

/**
 * Claim the next pending job for processing
 * Uses SKIP LOCKED for concurrent worker safety
 */
export async function claimNextJob(): Promise<ImageGenerationJob | null> {
  const result = await query(
    `UPDATE image_generation_jobs
     SET status = 'processing', started_at = NOW(), attempts = attempts + 1
     WHERE id = (
       SELECT id FROM image_generation_jobs
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING id, exercise_id, status, priority, attempts, last_error, started_at, completed_at, created_at`
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    status: row.status,
    priority: row.priority,
    attempts: row.attempts,
    lastError: row.last_error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

/**
 * Mark a job as complete
 */
export async function completeJob(jobId: number): Promise<void> {
  await query(
    `UPDATE image_generation_jobs
     SET status = 'complete', completed_at = NOW(), last_error = NULL
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * Mark a job as failed with an error message
 */
export async function failJob(jobId: number, error: string): Promise<void> {
  await query(
    `UPDATE image_generation_jobs
     SET status = 'failed', last_error = $2, completed_at = NOW()
     WHERE id = $1`,
    [jobId, error]
  );
}

/**
 * Reset a job back to pending (for retry)
 */
export async function resetJob(jobId: number): Promise<void> {
  await query(
    `UPDATE image_generation_jobs
     SET status = 'pending', started_at = NULL, completed_at = NULL
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * Retry all failed jobs that have fewer than maxAttempts
 * Returns the number of jobs reset
 */
export async function retryFailedJobs(maxAttempts: number = 3): Promise<number> {
  const result = await query(
    `UPDATE image_generation_jobs
     SET status = 'pending', started_at = NULL, completed_at = NULL
     WHERE status = 'failed' AND attempts < $1`,
    [maxAttempts]
  );

  return result.rowCount || 0;
}

/**
 * Reset stuck processing jobs (jobs that have been processing for too long)
 * Returns the number of jobs reset
 */
export async function resetStuckJobs(stuckThresholdMinutes: number = 10): Promise<number> {
  const result = await query(
    `UPDATE image_generation_jobs
     SET status = 'pending', started_at = NULL
     WHERE status = 'processing'
       AND started_at < NOW() - INTERVAL '1 minute' * $1`,
    [stuckThresholdMinutes]
  );

  return result.rowCount || 0;
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<JobStats> {
  const result = await query(
    `SELECT status, COUNT(*) as count
     FROM image_generation_jobs
     GROUP BY status`
  );

  const stats: JobStats = { pending: 0, processing: 0, complete: 0, failed: 0 };

  for (const row of result.rows) {
    const status = row.status as keyof JobStats;
    if (status in stats) {
      stats[status] = parseInt(row.count);
    }
  }

  return stats;
}

/**
 * Get pending job count
 */
export async function getPendingJobCount(): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM image_generation_jobs WHERE status = 'pending'`
  );
  return parseInt(result.rows[0].count);
}

/**
 * Get job by ID
 */
export async function getJob(jobId: number): Promise<ImageGenerationJob | null> {
  const result = await query(
    `SELECT id, exercise_id, status, priority, attempts, last_error, started_at, completed_at, created_at
     FROM image_generation_jobs
     WHERE id = $1`,
    [jobId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    status: row.status,
    priority: row.priority,
    attempts: row.attempts,
    lastError: row.last_error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

/**
 * Get jobs for an exercise
 */
export async function getJobsForExercise(exerciseId: number): Promise<ImageGenerationJob[]> {
  const result = await query(
    `SELECT id, exercise_id, status, priority, attempts, last_error, started_at, completed_at, created_at
     FROM image_generation_jobs
     WHERE exercise_id = $1
     ORDER BY created_at DESC`,
    [exerciseId]
  );

  return result.rows.map(row => ({
    id: row.id,
    exerciseId: row.exercise_id,
    status: row.status,
    priority: row.priority,
    attempts: row.attempts,
    lastError: row.last_error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  }));
}

/**
 * Delete old completed jobs (cleanup)
 * Returns the number of jobs deleted
 */
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
  const result = await query(
    `DELETE FROM image_generation_jobs
     WHERE status = 'complete'
       AND completed_at < NOW() - INTERVAL '1 day' * $1`,
    [olderThanDays]
  );

  return result.rowCount || 0;
}
