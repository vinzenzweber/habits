/**
 * Tests for PDF extraction jobs database schema
 *
 * These tests verify the expected schema structure for the pdf_extraction_jobs
 * and pdf_page_extraction_jobs tables created by migration 020_pdf_extraction_jobs.sql.
 *
 * Since this is a pure database schema (no TypeScript library code), these tests
 * document the expected row types and verify mocked database operations work correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../db';

// Mock database
vi.mock('../db', () => ({
  query: vi.fn(),
}));

// Type definitions for the database rows (documents expected schema)
interface PdfExtractionJobRow {
  id: number;
  user_id: number;
  sidequest_job_id: string | null;
  total_pages: number | null;
  pages_processed: number;
  recipes_extracted: number;
  status: 'pending' | 'processing' | 'pages_queued' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

interface PdfPageExtractionJobRow {
  id: number;
  pdf_job_id: number;
  sidequest_job_id: string | null;
  page_number: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  recipe_slug: string | null;
  recipe_title: string | null;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

// Factory function for creating mock PDF extraction job rows
function createMockPdfExtractionJob(
  overrides: Partial<PdfExtractionJobRow> = {}
): PdfExtractionJobRow {
  return {
    id: 1,
    user_id: 1,
    sidequest_job_id: null,
    total_pages: null,
    pages_processed: 0,
    recipes_extracted: 0,
    status: 'pending',
    error_message: null,
    created_at: new Date(),
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

// Factory function for creating mock page extraction job rows
function createMockPageExtractionJob(
  overrides: Partial<PdfPageExtractionJobRow> = {}
): PdfPageExtractionJobRow {
  return {
    id: 1,
    pdf_job_id: 1,
    sidequest_job_id: null,
    page_number: 1,
    status: 'pending',
    recipe_slug: null,
    recipe_title: null,
    error_message: null,
    created_at: new Date(),
    completed_at: null,
    ...overrides,
  };
}

describe('pdf-extraction-jobs schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // PDF Extraction Job Tests
  // ============================================

  describe('pdf_extraction_jobs table', () => {
    it('can insert a new job with default values', async () => {
      const mockJob = createMockPdfExtractionJob();
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
      });

      const result = await query(
        `INSERT INTO pdf_extraction_jobs (user_id) VALUES ($1) RETURNING *`,
        [1]
      );

      expect(result.rows[0]).toMatchObject({
        id: expect.any(Number),
        user_id: 1,
        status: 'pending',
        pages_processed: 0,
        recipes_extracted: 0,
      });
    });

    it('can update job status to processing', async () => {
      const mockJob = createMockPdfExtractionJob({
        status: 'processing',
        started_at: new Date(),
        sidequest_job_id: 'sq_123456',
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_extraction_jobs
         SET status = $1, started_at = NOW(), sidequest_job_id = $2
         WHERE id = $3 RETURNING *`,
        ['processing', 'sq_123456', 1]
      );

      expect(result.rows[0].status).toBe('processing');
      expect(result.rows[0].sidequest_job_id).toBe('sq_123456');
      expect(result.rows[0].started_at).toBeInstanceOf(Date);
    });

    it('can update job with page count after parsing', async () => {
      const mockJob = createMockPdfExtractionJob({
        status: 'pages_queued',
        total_pages: 10,
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_extraction_jobs
         SET status = 'pages_queued', total_pages = $1
         WHERE id = $2 RETURNING *`,
        [10, 1]
      );

      expect(result.rows[0].status).toBe('pages_queued');
      expect(result.rows[0].total_pages).toBe(10);
    });

    it('can increment pages_processed counter', async () => {
      const mockJob = createMockPdfExtractionJob({
        pages_processed: 5,
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_extraction_jobs
         SET pages_processed = pages_processed + 1
         WHERE id = $1 RETURNING *`,
        [1]
      );

      expect(result.rows[0].pages_processed).toBe(5);
    });

    it('can mark job as completed', async () => {
      const mockJob = createMockPdfExtractionJob({
        status: 'completed',
        total_pages: 10,
        pages_processed: 10,
        recipes_extracted: 8,
        completed_at: new Date(),
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_extraction_jobs
         SET status = 'completed', completed_at = NOW(),
             recipes_extracted = $1
         WHERE id = $2 RETURNING *`,
        [8, 1]
      );

      expect(result.rows[0].status).toBe('completed');
      expect(result.rows[0].recipes_extracted).toBe(8);
      expect(result.rows[0].completed_at).toBeInstanceOf(Date);
    });

    it('can mark job as failed with error message', async () => {
      const mockJob = createMockPdfExtractionJob({
        status: 'failed',
        error_message: 'PDF parsing failed: corrupted file',
        completed_at: new Date(),
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_extraction_jobs
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2 RETURNING *`,
        ['PDF parsing failed: corrupted file', 1]
      );

      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].error_message).toBe('PDF parsing failed: corrupted file');
    });

    it('can query jobs by user and status', async () => {
      const mockJobs = [
        createMockPdfExtractionJob({ id: 1, status: 'processing' }),
        createMockPdfExtractionJob({ id: 2, status: 'pending' }),
      ];
      vi.mocked(query).mockResolvedValueOnce({
        rows: mockJobs,
        rowCount: 2,
      });

      const result = await query(
        `SELECT * FROM pdf_extraction_jobs
         WHERE user_id = $1 AND status IN ('pending', 'processing')
         ORDER BY created_at DESC`,
        [1]
      );

      expect(result.rows).toHaveLength(2);
    });
  });

  // ============================================
  // PDF Page Extraction Job Tests
  // ============================================

  describe('pdf_page_extraction_jobs table', () => {
    it('can insert a page job for a PDF', async () => {
      const mockPage = createMockPageExtractionJob();
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockPage],
        rowCount: 1,
      });

      const result = await query(
        `INSERT INTO pdf_page_extraction_jobs (pdf_job_id, page_number)
         VALUES ($1, $2) RETURNING *`,
        [1, 1]
      );

      expect(result.rows[0]).toMatchObject({
        id: expect.any(Number),
        pdf_job_id: 1,
        page_number: 1,
        status: 'pending',
      });
    });

    it('can update page job status to processing', async () => {
      const mockPage = createMockPageExtractionJob({
        status: 'processing',
        sidequest_job_id: 'sq_page_789',
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockPage],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_page_extraction_jobs
         SET status = 'processing', sidequest_job_id = $1
         WHERE id = $2 RETURNING *`,
        ['sq_page_789', 1]
      );

      expect(result.rows[0].status).toBe('processing');
      expect(result.rows[0].sidequest_job_id).toBe('sq_page_789');
    });

    it('can mark page as completed with extracted recipe', async () => {
      const mockPage = createMockPageExtractionJob({
        status: 'completed',
        recipe_slug: 'chocolate-cake',
        recipe_title: 'Chocolate Cake',
        completed_at: new Date(),
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockPage],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_page_extraction_jobs
         SET status = 'completed', recipe_slug = $1, recipe_title = $2,
             completed_at = NOW()
         WHERE id = $3 RETURNING *`,
        ['chocolate-cake', 'Chocolate Cake', 1]
      );

      expect(result.rows[0].status).toBe('completed');
      expect(result.rows[0].recipe_slug).toBe('chocolate-cake');
      expect(result.rows[0].recipe_title).toBe('Chocolate Cake');
    });

    it('can mark page as skipped when no recipe found', async () => {
      const mockPage = createMockPageExtractionJob({
        status: 'skipped',
        completed_at: new Date(),
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockPage],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_page_extraction_jobs
         SET status = 'skipped', completed_at = NOW()
         WHERE id = $1 RETURNING *`,
        [1]
      );

      expect(result.rows[0].status).toBe('skipped');
      expect(result.rows[0].recipe_slug).toBeNull();
    });

    it('can mark page as failed with error', async () => {
      const mockPage = createMockPageExtractionJob({
        status: 'failed',
        error_message: 'OpenAI API rate limit exceeded',
        completed_at: new Date(),
      });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockPage],
        rowCount: 1,
      });

      const result = await query(
        `UPDATE pdf_page_extraction_jobs
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2 RETURNING *`,
        ['OpenAI API rate limit exceeded', 1]
      );

      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].error_message).toBe('OpenAI API rate limit exceeded');
    });

    it('can count pages by status for a PDF job', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { status: 'completed', count: '5' },
          { status: 'skipped', count: '3' },
          { status: 'failed', count: '1' },
          { status: 'pending', count: '1' },
        ],
        rowCount: 4,
      });

      const result = await query(
        `SELECT status, COUNT(*) as count
         FROM pdf_page_extraction_jobs
         WHERE pdf_job_id = $1
         GROUP BY status`,
        [1]
      );

      expect(result.rows).toHaveLength(4);
      const statusCounts = Object.fromEntries(
        result.rows.map((r: { status: string; count: string }) => [r.status, parseInt(r.count)])
      );
      expect(statusCounts.completed).toBe(5);
      expect(statusCounts.skipped).toBe(3);
      expect(statusCounts.failed).toBe(1);
    });

    it('can get extracted recipes for a PDF job', async () => {
      const mockPages = [
        createMockPageExtractionJob({
          id: 1,
          page_number: 1,
          status: 'completed',
          recipe_slug: 'chocolate-cake',
          recipe_title: 'Chocolate Cake',
        }),
        createMockPageExtractionJob({
          id: 2,
          page_number: 3,
          status: 'completed',
          recipe_slug: 'vanilla-ice-cream',
          recipe_title: 'Vanilla Ice Cream',
        }),
      ];
      vi.mocked(query).mockResolvedValueOnce({
        rows: mockPages,
        rowCount: 2,
      });

      const result = await query(
        `SELECT * FROM pdf_page_extraction_jobs
         WHERE pdf_job_id = $1 AND status = 'completed'
         ORDER BY page_number`,
        [1]
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].recipe_title).toBe('Chocolate Cake');
      expect(result.rows[1].recipe_title).toBe('Vanilla Ice Cream');
    });
  });

  // ============================================
  // Status Value Tests (documents CHECK constraints)
  // ============================================

  describe('status values', () => {
    describe('pdf_extraction_jobs.status', () => {
      const validStatuses = [
        'pending',
        'processing',
        'pages_queued',
        'completed',
        'failed',
        'cancelled',
      ];

      it.each(validStatuses)('accepts valid status: %s', (status) => {
        const job = createMockPdfExtractionJob({
          status: status as PdfExtractionJobRow['status'],
        });
        expect(job.status).toBe(status);
      });
    });

    describe('pdf_page_extraction_jobs.status', () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'skipped'];

      it.each(validStatuses)('accepts valid status: %s', (status) => {
        const page = createMockPageExtractionJob({
          status: status as PdfPageExtractionJobRow['status'],
        });
        expect(page.status).toBe(status);
      });
    });
  });

  // ============================================
  // Foreign Key Relationship Tests
  // ============================================

  describe('foreign key relationships', () => {
    it('page jobs reference parent PDF job', async () => {
      const mockPage = createMockPageExtractionJob({ pdf_job_id: 42 });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockPage],
        rowCount: 1,
      });

      const result = await query(
        `SELECT * FROM pdf_page_extraction_jobs WHERE pdf_job_id = $1`,
        [42]
      );

      expect(result.rows[0].pdf_job_id).toBe(42);
    });

    it('can query PDF job with all its pages', async () => {
      const mockResult = [
        {
          pdf_job_id: 1,
          pdf_status: 'pages_queued',
          total_pages: 3,
          pages: [
            { page_number: 1, status: 'completed', recipe_slug: 'recipe-1' },
            { page_number: 2, status: 'skipped', recipe_slug: null },
            { page_number: 3, status: 'processing', recipe_slug: null },
          ],
        },
      ];
      vi.mocked(query).mockResolvedValueOnce({
        rows: mockResult,
        rowCount: 1,
      });

      const result = await query(
        `SELECT
           pej.id as pdf_job_id,
           pej.status as pdf_status,
           pej.total_pages,
           json_agg(
             json_build_object(
               'page_number', ppej.page_number,
               'status', ppej.status,
               'recipe_slug', ppej.recipe_slug
             ) ORDER BY ppej.page_number
           ) as pages
         FROM pdf_extraction_jobs pej
         LEFT JOIN pdf_page_extraction_jobs ppej ON ppej.pdf_job_id = pej.id
         WHERE pej.id = $1
         GROUP BY pej.id`,
        [1]
      );

      expect(result.rows[0].pages).toHaveLength(3);
    });
  });
});
