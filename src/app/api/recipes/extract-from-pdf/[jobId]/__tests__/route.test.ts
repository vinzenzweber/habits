/**
 * Tests for GET /api/recipes/extract-from-pdf/[jobId]
 * Polling endpoint for PDF extraction job status
 *
 * Tests for DELETE /api/recipes/extract-from-pdf/[jobId]
 * Cancel endpoint for PDF extraction jobs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/sidequest-config', () => ({
  configureSidequest: vi.fn(),
}));

// Mock Sidequest
vi.mock('@/lib/sidequest-runtime', () => ({
  Sidequest: {
    job: {
      get: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import { Sidequest } from '@/lib/sidequest-runtime';

// Helper to create mock params
function createMockParams(jobId: string): { params: Promise<{ jobId: string }> } {
  return {
    params: Promise.resolve({ jobId }),
  };
}

function createParentJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 42,
    state: 'waiting',
    args: [{ userId: 123, totalPages: 2 }],
    inserted_at: new Date('2026-01-20T10:30:00.000Z'),
    completed_at: null,
    errors: null,
    ...overrides,
  };
}

describe('GET /api/recipes/extract-from-pdf/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated user
    vi.mocked(auth).mockResolvedValue({
      user: { id: '123' },
    } as never);

    vi.mocked(Sidequest.job.get).mockResolvedValue(createParentJob() as never);
    vi.mocked(query).mockResolvedValue({ rows: [] });
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('input validation', () => {
    it('returns 400 for non-numeric job ID', async () => {
      const response = await GET(new Request('http://localhost'), createMockParams('invalid'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid job ID');
    });
  });

  describe('authorization', () => {
    it('returns 404 when job not found', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(null as never);

      const response = await GET(new Request('http://localhost'), createMockParams('999'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('returns 404 when job belongs to different user', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ args: [{ userId: 999, totalPages: 2 }] }) as never
      );

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });
  });

  describe('status mapping', () => {
    it('returns pending for waiting parent job', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ state: 'waiting' }) as never
      );

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('pending');
    });

    it('returns processing for running parent job', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ state: 'running' }) as never
      );

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('processing');
    });

    it('returns pages_queued when child jobs are still running', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ state: 'completed', args: [{ userId: 123, totalPages: 2 }] }) as never
      );
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { id: 1, state: 'completed', result: { pageNumber: 1, recipeSlug: 'r1', recipeTitle: 'R1' } },
          { id: 2, state: 'running', result: null },
        ],
      });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.status).toBe('pages_queued');
      expect(data.progress.currentPage).toBe(1);
      expect(data.progress.totalPages).toBe(2);
      expect(data.recipes).toHaveLength(1);
    });

    it('returns completed with recipes and skipped pages', async () => {
      const completedAt = new Date('2026-01-20T11:00:00.000Z');
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({
          state: 'completed',
          completed_at: completedAt,
          args: [{ userId: 123, totalPages: 2 }],
        }) as never
      );
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { id: 1, state: 'completed', result: { pageNumber: 1, recipeSlug: 'r1', recipeTitle: 'R1' } },
          { id: 2, state: 'completed', result: { pageNumber: 2, skipped: true } },
        ],
      });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.status).toBe('completed');
      expect(data.completedAt).toBe('2026-01-20T11:00:00.000Z');
      expect(data.recipes).toEqual([{ slug: 'r1', title: 'R1', pageNumber: 1 }]);
      expect(data.skippedPages).toEqual([2]);
    });

    it('returns failed when parent job fails', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({
          state: 'failed',
          errors: [{ message: 'PDF parsing failed' }],
        }) as never
      );

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.status).toBe('failed');
      expect(data.error).toBe('PDF parsing failed');
    });

    it('returns failed when any child job fails', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ state: 'completed', args: [{ userId: 123, totalPages: 2 }] }) as never
      );
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { id: 1, state: 'failed', result: null },
          { id: 2, state: 'completed', result: { pageNumber: 2, recipeSlug: 'r2', recipeTitle: 'R2' } },
        ],
      });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.status).toBe('failed');
      expect(data.error).toBe('One or more pages failed to process');
    });

    it('returns cancelled for canceled parent job', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ state: 'canceled' }) as never
      );

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.status).toBe('cancelled');
    });
  });

  describe('response format', () => {
    it('returns correct response structure', async () => {
      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data).toHaveProperty('jobId');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('progress');
      expect(data.progress).toHaveProperty('currentPage');
      expect(data.progress).toHaveProperty('totalPages');
      expect(data.progress).toHaveProperty('recipesExtracted');
      expect(data).toHaveProperty('recipes');
      expect(data).toHaveProperty('skippedPages');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('completedAt');
    });
  });

  describe('error handling', () => {
    it('returns 500 on database error', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch job status');
    });
  });
});

describe('DELETE /api/recipes/extract-from-pdf/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: '123' },
    } as never);

    vi.mocked(Sidequest.job.get).mockResolvedValue(createParentJob() as never);
    vi.mocked(query).mockResolvedValue({ rows: [] });
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('input validation', () => {
    it('returns 400 for non-numeric job ID', async () => {
      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('invalid'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid job ID');
    });
  });

  describe('authorization', () => {
    it('returns 404 when job not found', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(null as never);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('999'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('returns 404 when job belongs to different user', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ args: [{ userId: 999, totalPages: 2 }] }) as never
      );

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });
  });

  describe('cancellation', () => {
    it('returns 400 when job is already completed', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(
        createParentJob({ state: 'completed' }) as never
      );

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot cancel job: job is already completed');
    });

    it('cancels parent and child jobs', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: 101 }, { id: 102 }] });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Sidequest.job.cancel).toHaveBeenCalledWith(42);
      expect(Sidequest.job.cancel).toHaveBeenCalledWith(101);
      expect(Sidequest.job.cancel).toHaveBeenCalledWith(102);
    });
  });

  describe('error handling', () => {
    it('returns 500 on database error during child job lookup', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cancel job');
    });
  });
});
