/**
 * Tests for recipe extraction from PDF API route
 * The route enqueues background jobs for async PDF processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

// Mock user-preferences
vi.mock('@/lib/user-preferences', () => ({
  getRegionFromTimezone: vi.fn().mockReturnValue('Europe/Vienna'),
}));

// Mock pdf-utils
vi.mock('@/lib/pdf-utils', () => ({
  getPdfInfo: vi.fn(),
  MAX_PDF_PAGES: 50,
}));

// Mock SideQuest with dynamic import support
const mockEnqueue = vi.fn();
const mockMaxAttempts = vi.fn().mockReturnThis();
const mockTimeout = vi.fn().mockReturnValue({ maxAttempts: mockMaxAttempts, enqueue: mockEnqueue });
const mockQueue = vi.fn().mockReturnValue({ timeout: mockTimeout, maxAttempts: mockMaxAttempts, enqueue: mockEnqueue });
const mockBuild = vi.fn().mockReturnValue({ queue: mockQueue, timeout: mockTimeout, maxAttempts: mockMaxAttempts, enqueue: mockEnqueue });

vi.mock('sidequest', () => ({
  Sidequest: {
    build: mockBuild,
  },
}));

// Mock ProcessPdfJob (just the import, not the class itself)
class MockProcessPdfJob {}
vi.mock('@/jobs/ProcessPdfJob', () => ({
  ProcessPdfJob: MockProcessPdfJob,
}));

import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import { getPdfInfo } from '@/lib/pdf-utils';

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown> | null): Request {
  return {
    json: vi.fn().mockResolvedValue(body || {}),
  } as unknown as Request;
}

describe('POST /api/recipes/extract-from-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated user
    vi.mocked(auth).mockResolvedValue({
      user: { id: '123', locale: 'en-US' },
    } as never);

    // Default PDF info with one page
    vi.mocked(getPdfInfo).mockResolvedValue({
      pageCount: 1,
    });

    // Default database responses
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ id: 42 }] }) // INSERT job
      .mockResolvedValueOnce({ rows: [] }); // UPDATE sidequest_job_id

    // Default SideQuest enqueue response
    mockEnqueue.mockResolvedValue({ id: 'sq_test_123' });
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('input validation', () => {
    it('returns 400 when no pdfBase64 provided', async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No PDF data provided');
    });

    it('returns 400 when pdfBase64 is not a string', async () => {
      const request = createMockRequest({ pdfBase64: 123 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No PDF data provided');
    });

    it('returns 400 when pdfBase64 is too large', async () => {
      // Create a string larger than 15MB
      const largeBase64 = 'a'.repeat(16 * 1024 * 1024);
      const request = createMockRequest({ pdfBase64: largeBase64 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('PDF too large. Please use a smaller file.');
    });
  });

  describe('PDF parsing errors', () => {
    it('returns 400 for password-protected PDFs', async () => {
      vi.mocked(getPdfInfo).mockRejectedValueOnce(
        new Error('password required')
      );
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('This PDF is password-protected. Please provide an unprotected PDF.');
    });

    it('returns 400 when PDF has too many pages', async () => {
      vi.mocked(getPdfInfo).mockResolvedValueOnce({
        pageCount: 51,
      });
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('PDF has too many pages (51). Maximum: 50');
    });
  });

  describe('successful job enqueueing', () => {
    it('returns 202 Accepted with job ID', async () => {
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.jobId).toBe(42);
    });

    it('creates pdf_extraction_jobs record in database', async () => {
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      await POST(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pdf_extraction_jobs'),
        expect.arrayContaining([123, 1]) // userId, pageCount
      );
    });

    it('enqueues ProcessPdfJob with correct parameters', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: '123',
          locale: 'en-US',
          defaultRecipeLocale: 'de-DE',
          userRegionTimezone: 'Europe/Vienna',
        },
      } as never);

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      await POST(request);

      expect(mockBuild).toHaveBeenCalledWith(MockProcessPdfJob);
      expect(mockQueue).toHaveBeenCalledWith('pdf-processing');
      expect(mockTimeout).toHaveBeenCalledWith(600000);
      expect(mockMaxAttempts).toHaveBeenCalledWith(1);
      expect(mockEnqueue).toHaveBeenCalledWith({
        pdfJobId: 42,
        userId: 123,
        pdfBase64: 'somebase64data',
        targetLocale: 'de-DE',
        targetRegion: expect.any(String),
      });
    });

    it('updates job record with sidequest_job_id', async () => {
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      await POST(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pdf_extraction_jobs'),
        ['sq_test_123', 42]
      );
    });

    it('returns immediately without processing pages', async () => {
      vi.mocked(getPdfInfo).mockResolvedValue({ pageCount: 50 });
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const startTime = Date.now();
      await POST(request);
      const duration = Date.now() - startTime;

      // Should return almost immediately (no page processing)
      expect(duration).toBeLessThan(100);
    });

    it('handles multi-page PDFs by enqueuing single job', async () => {
      vi.mocked(getPdfInfo).mockResolvedValue({ pageCount: 10 });
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.jobId).toBe(42);
      // Should only call enqueue once (not per-page)
      expect(mockEnqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('returns 500 when database insert fails', async () => {
      vi.mocked(query).mockReset();
      vi.mocked(query).mockRejectedValueOnce(new Error('Database error'));
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to enqueue PDF processing. Please try again.');
    });

    it('returns 500 when SideQuest enqueue fails', async () => {
      mockEnqueue.mockRejectedValueOnce(new Error('Queue error'));
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to enqueue PDF processing. Please try again.');
    });

    it('returns 500 on unexpected PDF parsing error', async () => {
      vi.mocked(getPdfInfo).mockRejectedValueOnce(
        new Error('Unexpected error')
      );
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to enqueue PDF processing. Please try again.');
    });
  });
});
