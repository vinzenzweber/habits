/**
 * Tests for PDF utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePdfFile,
  validatePdfBase64Size,
  MAX_PDF_SIZE_MB,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_PAGES,
  MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION,
} from '../pdf-utils';
import { createMockFile } from './fixtures/recipe-fixtures';

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
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

    it('exports MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION as 200', () => {
      expect(MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION).toBe(200);
    });
  });
});

describe('extractPdfText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts text from a valid PDF buffer', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    (pdfParse as ReturnType<typeof vi.fn>).mockResolvedValue({
      numpages: 2,
      text: 'Page 1 content\n\nPage 2 content',
    });

    const { extractPdfText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');
    const result = await extractPdfText(buffer);

    expect(result.pageCount).toBe(2);
    expect(result.totalText).toBe('Page 1 content\n\nPage 2 content');
  });

  it('throws error when PDF has too many pages', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    (pdfParse as ReturnType<typeof vi.fn>).mockResolvedValue({
      numpages: 51,
      text: 'Too many pages',
    });

    const { extractPdfText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');

    await expect(extractPdfText(buffer)).rejects.toThrow('PDF has too many pages (51). Maximum: 50');
  });
});

describe('extractPdfPagesText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts text from each page of a PDF', async () => {
    const mockTextContent = {
      items: [
        { str: 'Hello' },
        { str: ' ' },
        { str: 'World' },
      ],
    };

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue(mockTextContent),
    };

    const mockPdfDoc = {
      numPages: 2,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc),
    });

    const { extractPdfPagesText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');
    const result = await extractPdfPagesText(buffer);

    expect(result.pageCount).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].textContent).toBe('Hello   World');
    expect(result.pages[0].hasSignificantText).toBe(false); // Less than 200 chars
  });

  it('marks pages with significant text appropriately', async () => {
    const longText = 'A'.repeat(250);
    const mockTextContent = {
      items: [{ str: longText }],
    };

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue(mockTextContent),
    };

    const mockPdfDoc = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc),
    });

    const { extractPdfPagesText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');
    const result = await extractPdfPagesText(buffer);

    expect(result.pages[0].hasSignificantText).toBe(true);
  });

  it('throws error when PDF has too many pages', async () => {
    const mockPdfDoc = {
      numPages: 51,
      getPage: vi.fn(),
    };

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc),
    });

    const { extractPdfPagesText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');

    await expect(extractPdfPagesText(buffer)).rejects.toThrow('PDF has too many pages (51). Maximum: 50');
  });
});

describe('extractPageText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts text from a specific page', async () => {
    const mockTextContent = {
      items: [
        { str: 'Page' },
        { str: ' ' },
        { str: '2' },
      ],
    };

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue(mockTextContent),
    };

    const mockPdfDoc = {
      numPages: 3,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc),
    });

    const { extractPageText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');
    const result = await extractPageText(buffer, 2);

    expect(result).toBe('Page   2');
    expect(mockPdfDoc.getPage).toHaveBeenCalledWith(2);
  });

  it('throws error for invalid page number (too low)', async () => {
    const mockPdfDoc = {
      numPages: 3,
      getPage: vi.fn(),
    };

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc),
    });

    const { extractPageText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');

    await expect(extractPageText(buffer, 0)).rejects.toThrow('Invalid page number: 0. PDF has 3 pages.');
  });

  it('throws error for invalid page number (too high)', async () => {
    const mockPdfDoc = {
      numPages: 3,
      getPage: vi.fn(),
    };

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    (pdfjsLib.getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc),
    });

    const { extractPageText } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');

    await expect(extractPageText(buffer, 5)).rejects.toThrow('Invalid page number: 5. PDF has 3 pages.');
  });
});

describe('getPdfPageCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the page count of a PDF', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    (pdfParse as ReturnType<typeof vi.fn>).mockResolvedValue({
      numpages: 5,
      text: 'Some text',
    });

    const { getPdfPageCount } = await import('../pdf-utils');
    const buffer = Buffer.from('fake pdf content');
    const count = await getPdfPageCount(buffer);

    expect(count).toBe(5);
  });
});
