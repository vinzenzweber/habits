/**
 * Tests for client-side image utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateImageFile,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
  generateImageId,
} from '../image-utils';
import { createMockFile } from './fixtures/recipe-fixtures';

describe('image-utils', () => {
  describe('validateImageFile', () => {
    describe('valid file types', () => {
      it('accepts JPEG files', () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('accepts PNG files', () => {
        const file = createMockFile('test.png', 'image/png', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('accepts WebP files', () => {
        const file = createMockFile('test.webp', 'image/webp', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('accepts GIF files', () => {
        const file = createMockFile('test.gif', 'image/gif', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('accepts all allowed image types', () => {
        ALLOWED_IMAGE_TYPES.forEach((type) => {
          const file = createMockFile('test', type, 1024);
          const result = validateImageFile(file);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('invalid file types', () => {
      it('rejects PDF files', () => {
        const file = createMockFile('test.pdf', 'application/pdf', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });

      it('rejects text files', () => {
        const file = createMockFile('test.txt', 'text/plain', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });

      it('rejects SVG files', () => {
        const file = createMockFile('test.svg', 'image/svg+xml', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });

      it('rejects BMP files', () => {
        const file = createMockFile('test.bmp', 'image/bmp', 1024);
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });

      it('lists allowed types in error message', () => {
        const file = createMockFile('test.txt', 'text/plain', 1024);
        const result = validateImageFile(file);
        expect(result.error).toContain('JPEG');
        expect(result.error).toContain('PNG');
        expect(result.error).toContain('WebP');
        expect(result.error).toContain('GIF');
      });
    });

    describe('file size validation', () => {
      it('accepts files under the size limit', () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
      });

      it('accepts files exactly at the size limit', () => {
        const file = createMockFile('test.jpg', 'image/jpeg', MAX_FILE_SIZE_BYTES);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
      });

      it('rejects files exceeding the size limit', () => {
        const file = createMockFile('test.jpg', 'image/jpeg', MAX_FILE_SIZE_BYTES + 1);
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File too large');
        expect(result.error).toContain(`${MAX_FILE_SIZE_MB}MB`);
      });

      it('rejects very large files', () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 100 * 1024 * 1024); // 100MB
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File too large');
      });
    });

    describe('edge cases', () => {
      it('accepts very small files', () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
      });

      it('validates type before size', () => {
        // Invalid type and over size - should report type error first
        const file = createMockFile('test.txt', 'text/plain', MAX_FILE_SIZE_BYTES + 1);
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });
    });
  });

  describe('generateImageId', () => {
    let originalRandomUUID: typeof crypto.randomUUID;

    beforeEach(() => {
      originalRandomUUID = crypto.randomUUID;
    });

    afterEach(() => {
      crypto.randomUUID = originalRandomUUID;
    });

    it('returns a UUID format string', () => {
      const id = generateImageId();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('generates unique values on each call', () => {
      const id1 = generateImageId();
      const id2 = generateImageId();
      const id3 = generateImageId();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('uses crypto.randomUUID internally', () => {
      const mockUUID = 'mock-uuid-1234-5678-9abc-def012345678';
      crypto.randomUUID = vi.fn(() => mockUUID);

      const id = generateImageId();
      expect(id).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalled();
    });

    it('generates many unique IDs without collision', () => {
      const ids = new Set<string>();
      const numIds = 100;

      for (let i = 0; i < numIds; i++) {
        ids.add(generateImageId());
      }

      expect(ids.size).toBe(numIds);
    });
  });

  describe('constants', () => {
    it('exports MAX_FILE_SIZE_MB as 10', () => {
      expect(MAX_FILE_SIZE_MB).toBe(10);
    });

    it('exports MAX_FILE_SIZE_BYTES correctly calculated', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });

    it('exports ALLOWED_IMAGE_TYPES with expected types', () => {
      expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/gif');
      expect(ALLOWED_IMAGE_TYPES).toHaveLength(4);
    });
  });
});
