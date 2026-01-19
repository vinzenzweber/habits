/**
 * Tests for PDF utilities
 *
 * PDF extraction uses a unified Vision API approach where each page is
 * rendered to an image and processed by the vision model. This test file
 * covers validation and basic PDF operations.
 *
 * Image rendering tests that require pdftoppm are in pdf-extraction-integration.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePdfFile,
  validatePdfBase64Size,
  MAX_PDF_SIZE_MB,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_PAGES,
  DEFAULT_PDF_RENDER_DPI,
} from '../pdf-utils';
import { createMockFile } from './fixtures/recipe-fixtures';

// Mock pdfjs-dist worker (must be imported first in actual code)
vi.mock('pdfjs-dist/legacy/build/pdf.worker.mjs', () => ({
  WorkerMessageHandler: {},
}));

// Mock pdfjs-dist
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(),
}));

describe('pdf-utils', () => {
  describe('validatePdfFile', () => {
    it('accepts valid PDF files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024);
      const result = validatePdfFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects non-PDF files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024);
      const result = validatePdfFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Expected PDF.');
    });

    it('rejects files that are too large', () => {
      const file = createMockFile('test.pdf', 'application/pdf', MAX_PDF_SIZE_BYTES + 1);
      const result = validatePdfFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF too large');
      expect(result.error).toContain(`${MAX_PDF_SIZE_MB}MB`);
    });

    it('accepts files at exactly the size limit', () => {
      const file = createMockFile('test.pdf', 'application/pdf', MAX_PDF_SIZE_BYTES);
      const result = validatePdfFile(file);
      expect(result.valid).toBe(true);
    });

    it('rejects text files with PDF extension', () => {
      const file = createMockFile('test.pdf', 'text/plain', 1024);
      const result = validatePdfFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Expected PDF.');
    });
  });

  describe('validatePdfBase64Size', () => {
    it('accepts base64 strings within size limit', () => {
      // 1KB of base64 data (approximately 750 bytes binary)
      const base64 = 'A'.repeat(1000);
      const result = validatePdfBase64Size(base64);
      expect(result.valid).toBe(true);
    });

    it('rejects base64 strings that are too large', () => {
      // Create base64 string that would exceed 10MB when decoded
      // Base64 is ~33% larger than binary, so ~14MB base64 = ~10.5MB binary
      const base64 = 'A'.repeat(14 * 1024 * 1024);
      const result = validatePdfBase64Size(base64);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF too large');
    });
  });

  describe('constants', () => {
    it('exports MAX_PDF_SIZE_MB as 10', () => {
      expect(MAX_PDF_SIZE_MB).toBe(10);
    });

    it('exports MAX_PDF_SIZE_BYTES correctly calculated', () => {
      expect(MAX_PDF_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });

    it('exports MAX_PDF_PAGES as 50', () => {
      expect(MAX_PDF_PAGES).toBe(50);
    });

    it('exports DEFAULT_PDF_RENDER_DPI as 200', () => {
      expect(DEFAULT_PDF_RENDER_DPI).toBe(200);
    });
  });

  describe('getPdfInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns page count from PDF', async () => {
      const mockPdfDoc = {
        numPages: 5,
      };

      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      });

      const { getPdfInfo } = await import('../pdf-utils');
      const buffer = Buffer.from('fake pdf content');
      const result = await getPdfInfo(buffer);

      expect(result.pageCount).toBe(5);
    });

    it('throws error when PDF has too many pages', async () => {
      const mockPdfDoc = {
        numPages: 51,
      };

      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      });

      const { getPdfInfo } = await import('../pdf-utils');
      const buffer = Buffer.from('fake pdf content');

      await expect(getPdfInfo(buffer)).rejects.toThrow(
        'PDF has too many pages (51). Maximum: 50'
      );
    });
  });
});
