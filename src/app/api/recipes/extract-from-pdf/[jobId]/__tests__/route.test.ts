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

import { auth } from '@/lib/auth';
import { query } from '@/lib/db';

// Helper to create mock params
function createMockParams(jobId: string): { params: Promise<{ jobId: string }> } {
  return {
    params: Promise.resolve({ jobId }),
  };
}

// Mock job row factory
function createMockJobRow(overrides: Partial<{
  id: number;
  user_id: number;
  total_pages: number | null;
  pages_processed: number;
  recipes_extracted: number;
  status: string;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}> = {}) {
  return {
    id: 42,
    user_id: 123,
    total_pages: 10,
    pages_processed: 5,
    recipes_extracted: 3,
    status: 'pages_queued',
    error_message: null,
    created_at: new Date('2026-01-20T10:30:00.000Z'),
    completed_at: null,
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

    it('returns 400 for empty job ID', async () => {
      const response = await GET(new Request('http://localhost'), createMockParams(''));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid job ID');
    });
  });

  describe('authorization', () => {
    it('returns 404 when job not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('999'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('returns 404 when job belongs to different user (prevents enumeration)', async () => {
      // Job exists but user_id doesn't match - query returns empty
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');

      // Verify query includes user_id check
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $2'),
        [42, 123]
      );
    });
  });

  describe('job status - pending', () => {
    it('returns correct status for pending job', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ status: 'pending', pages_processed: 0, recipes_extracted: 0 })],
        })
        .mockResolvedValueOnce({ rows: [] }) // no recipes
        .mockResolvedValueOnce({ rows: [] }); // no skipped pages

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('pending');
      expect(data.progress.currentPage).toBe(0);
      expect(data.progress.recipesExtracted).toBe(0);
      expect(data.recipes).toEqual([]);
      expect(data.skippedPages).toEqual([]);
    });
  });

  describe('job status - processing', () => {
    it('returns correct status for processing job', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ status: 'processing', pages_processed: 2, recipes_extracted: 1 })],
        })
        .mockResolvedValueOnce({
          rows: [{ recipe_slug: 'chocolate-cake', recipe_title: 'Chocolate Cake', page_number: 1 }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('processing');
      expect(data.progress.currentPage).toBe(2);
      expect(data.progress.recipesExtracted).toBe(1);
      expect(data.recipes).toHaveLength(1);
      expect(data.recipes[0]).toEqual({
        slug: 'chocolate-cake',
        title: 'Chocolate Cake',
        pageNumber: 1,
      });
    });
  });

  describe('job status - pages_queued with partial results', () => {
    it('returns extracted recipes and skipped pages', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({
            status: 'pages_queued',
            total_pages: 10,
            pages_processed: 5,
            recipes_extracted: 3,
          })],
        })
        .mockResolvedValueOnce({
          rows: [
            { recipe_slug: 'chocolate-cake', recipe_title: 'Chocolate Cake', page_number: 1 },
            { recipe_slug: 'vanilla-ice-cream', recipe_title: 'Vanilla Ice Cream', page_number: 3 },
            { recipe_slug: 'banana-bread', recipe_title: 'Banana Bread', page_number: 4 },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ page_number: 2 }],
        });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('pages_queued');
      expect(data.progress).toEqual({
        currentPage: 5,
        totalPages: 10,
        recipesExtracted: 3,
      });
      expect(data.recipes).toHaveLength(3);
      expect(data.recipes[0]).toEqual({ slug: 'chocolate-cake', title: 'Chocolate Cake', pageNumber: 1 });
      expect(data.recipes[1]).toEqual({ slug: 'vanilla-ice-cream', title: 'Vanilla Ice Cream', pageNumber: 3 });
      expect(data.recipes[2]).toEqual({ slug: 'banana-bread', title: 'Banana Bread', pageNumber: 4 });
      expect(data.skippedPages).toEqual([2]);
    });
  });

  describe('job status - completed', () => {
    it('returns full results for completed job', async () => {
      const completedAt = new Date('2026-01-20T11:00:00.000Z');
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({
            status: 'completed',
            total_pages: 3,
            pages_processed: 3,
            recipes_extracted: 2,
            completed_at: completedAt,
          })],
        })
        .mockResolvedValueOnce({
          rows: [
            { recipe_slug: 'recipe-1', recipe_title: 'Recipe 1', page_number: 1 },
            { recipe_slug: 'recipe-2', recipe_title: 'Recipe 2', page_number: 3 },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ page_number: 2 }],
        });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.completedAt).toBe('2026-01-20T11:00:00.000Z');
      expect(data.progress.currentPage).toBe(3);
      expect(data.progress.totalPages).toBe(3);
      expect(data.recipes).toHaveLength(2);
      expect(data.skippedPages).toEqual([2]);
    });
  });

  describe('job status - failed', () => {
    it('returns error message for failed job', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({
            status: 'failed',
            error_message: 'PDF parsing failed: corrupted file',
            pages_processed: 0,
            recipes_extracted: 0,
          })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.error).toBe('PDF parsing failed: corrupted file');
      expect(data.recipes).toEqual([]);
    });
  });

  describe('job status - cancelled', () => {
    it('returns cancelled status', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ status: 'cancelled' })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('cancelled');
    });
  });

  describe('edge cases', () => {
    it('returns empty arrays when no recipes extracted yet', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ status: 'processing', recipes_extracted: 0 })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipes).toEqual([]);
      expect(data.skippedPages).toEqual([]);
    });

    it('handles null total_pages by returning 0', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ total_pages: null })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.progress.totalPages).toBe(0);
    });

    it('handles multiple skipped pages', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ status: 'completed' })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ page_number: 2 }, { page_number: 4 }, { page_number: 6 }],
        });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.skippedPages).toEqual([2, 4, 6]);
    });
  });

  describe('response format', () => {
    it('returns correct response structure', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow()],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

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

    it('formats dates as ISO strings', async () => {
      const createdAt = new Date('2026-01-20T10:30:00.000Z');
      const completedAt = new Date('2026-01-20T11:00:00.000Z');

      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ created_at: createdAt, completed_at: completedAt })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.createdAt).toBe('2026-01-20T10:30:00.000Z');
      expect(data.completedAt).toBe('2026-01-20T11:00:00.000Z');
    });

    it('returns null for completedAt when not set', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [createMockJobRow({ completed_at: null })],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(data.completedAt).toBeNull();
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

    it('returns 500 when recipes query fails', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [createMockJobRow()] })
        .mockRejectedValueOnce(new Error('Query failed'));

      const response = await GET(new Request('http://localhost'), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch job status');
    });
  });

  describe('query optimization', () => {
    it('runs recipes and skipped pages queries in parallel', async () => {
      const queryStart: number[] = [];
      const queryEnd: number[] = [];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [createMockJobRow()] })
        .mockImplementationOnce(async () => {
          queryStart.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          queryEnd.push(Date.now());
          return { rows: [] };
        })
        .mockImplementationOnce(async () => {
          queryStart.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          queryEnd.push(Date.now());
          return { rows: [] };
        });

      await GET(new Request('http://localhost'), createMockParams('42'));

      // Both parallel queries should start at nearly the same time
      expect(Math.abs(queryStart[0] - queryStart[1])).toBeLessThan(5);
    });

    it('only queries for completed and skipped statuses', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [createMockJobRow()] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await GET(new Request('http://localhost'), createMockParams('42'));

      // Second call should query for completed recipes
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("status = 'completed'"),
        expect.any(Array)
      );

      // Third call should query for skipped pages
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("status = 'skipped'"),
        expect.any(Array)
      );
    });
  });
});

describe('DELETE /api/recipes/extract-from-pdf/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: '123' },
    } as never);
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
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('999'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('returns 404 when job belongs to different user (prevents enumeration)', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $2'),
        [42, 123]
      );
    });
  });

  describe('cancellation - already finished jobs', () => {
    it('returns 400 when job is already completed', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 42, status: 'completed', sidequest_job_id: 'sq-123' }],
      });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot cancel job: job is already completed');
    });

    it('returns 400 when job is already failed', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 42, status: 'failed', sidequest_job_id: 'sq-123' }],
      });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot cancel job: job is already failed');
    });

    it('returns 400 when job is already cancelled', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 42, status: 'cancelled', sidequest_job_id: 'sq-123' }],
      });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot cancel job: job is already cancelled');
    });
  });

  describe('cancellation - pending job', () => {
    it('cancels pending job successfully', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ id: 42, status: 'pending', sidequest_job_id: 'sq-123' }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE pdf_extraction_jobs
        .mockResolvedValueOnce({ rows: [] }); // UPDATE pdf_page_extraction_jobs

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify parent job update
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("SET status = 'cancelled'"),
        [42]
      );

      // Verify child jobs update (uses 'skipped' per DB constraint on pdf_page_extraction_jobs)
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("SET status = 'skipped'"),
        [42]
      );
    });
  });

  describe('cancellation - processing job', () => {
    it('cancels processing job successfully', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ id: 42, status: 'processing', sidequest_job_id: 'sq-123' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('cancellation - pages_queued job', () => {
    it('cancels pages_queued job and pending child jobs', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ id: 42, status: 'pages_queued', sidequest_job_id: 'sq-123' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify child jobs with pending status are cancelled
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("status = 'pending'"),
        [42]
      );
    });
  });

  describe('error handling', () => {
    it('returns 500 on database error during query', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cancel job');
    });

    it('returns 500 on database error during update', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ id: 42, status: 'pending', sidequest_job_id: 'sq-123' }],
        })
        .mockRejectedValueOnce(new Error('Update failed'));

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), createMockParams('42'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cancel job');
    });
  });
});
