/**
 * Tests for recipe image upload API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import {
  createMockImageBuffer,
  createMockInvalidBuffer,
} from '@/lib/__tests__/fixtures/recipe-fixtures';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock recipe-image-storage
vi.mock('@/lib/recipe-image-storage', () => ({
  saveRecipeImage: vi.fn().mockResolvedValue({
    storagePath: 'recipes/user123/image456.jpg',
    fileSizeBytes: 1024,
  }),
  getRecipeImageUrl: vi.fn().mockReturnValue('/api/recipes/images/user123/image456'),
}));

import { auth } from '@/lib/auth';
import { saveRecipeImage, getRecipeImageUrl } from '@/lib/recipe-image-storage';

// Helper to create a mock File with arrayBuffer method that works in Node.js
function createMockFile(buffer: Buffer, name: string, type: string) {
  return {
    name,
    type,
    size: buffer.length,
    arrayBuffer: vi.fn().mockResolvedValue(buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )),
    slice: vi.fn(),
    stream: vi.fn(),
    text: vi.fn(),
    lastModified: Date.now(),
  };
}

// Helper to create mock FormData with file
function createMockRequest(
  file: ReturnType<typeof createMockFile> | File | null
): Request {
  const mockFormData = {
    get: vi.fn().mockReturnValue(file),
    append: vi.fn(),
    delete: vi.fn(),
    entries: vi.fn(),
    forEach: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    set: vi.fn(),
    values: vi.fn(),
  };

  return {
    formData: vi.fn().mockResolvedValue(mockFormData),
  } as unknown as Request;
}

// Keep the old helper for backwards compatibility with tests using real File
function createFileWithBuffer(buffer: Buffer, name: string, type: string) {
  return createMockFile(buffer, name, type);
}

describe('POST /api/recipes/images/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user123' },
    } as never);
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const request = createMockRequest(null);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);
      const request = createMockRequest(null);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('file validation', () => {
    it('returns 400 when no file provided', async () => {
      const request = createMockRequest(null);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No image file provided');
    });

    it('returns 400 for invalid file type', async () => {
      const file = createMockFile(Buffer.from('test'), 'test.txt', 'text/plain');
      const request = createMockRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('returns 400 for PDF files', async () => {
      const file = createMockFile(Buffer.from('test'), 'test.pdf', 'application/pdf');
      const request = createMockRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('returns 400 for oversized files', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      const file = createFileWithBuffer(largeBuffer, 'large.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File too large');
    });
  });

  describe('magic bytes validation', () => {
    it('returns 400 for invalid JPEG magic bytes', async () => {
      const invalidBuffer = createMockInvalidBuffer(1024);
      const file = createFileWithBuffer(invalidBuffer, 'fake.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid image data');
    });

    it('accepts valid JPEG magic bytes', async () => {
      const validBuffer = createMockImageBuffer('jpeg', 1024);
      const file = createFileWithBuffer(validBuffer, 'valid.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('accepts valid PNG magic bytes', async () => {
      const validBuffer = createMockImageBuffer('png', 1024);
      const file = createFileWithBuffer(validBuffer, 'valid.png', 'image/png');
      const request = createMockRequest(file);

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('accepts valid GIF magic bytes', async () => {
      const validBuffer = createMockImageBuffer('gif', 1024);
      const file = createFileWithBuffer(validBuffer, 'valid.gif', 'image/gif');
      const request = createMockRequest(file);

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('accepts valid WebP magic bytes', async () => {
      const validBuffer = createMockImageBuffer('webp', 1024);
      const file = createFileWithBuffer(validBuffer, 'valid.webp', 'image/webp');
      const request = createMockRequest(file);

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('successful upload', () => {
    it('returns 201 with url on success', async () => {
      const validBuffer = createMockImageBuffer('jpeg', 1024);
      const file = createFileWithBuffer(validBuffer, 'image.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.url).toBe('/api/recipes/images/user123/image456');
      expect(data.storagePath).toBe('recipes/user123/image456.jpg');
      expect(data.fileSizeBytes).toBe(1024);
    });

    it('calls saveRecipeImage with correct parameters', async () => {
      const validBuffer = createMockImageBuffer('jpeg', 1024);
      const file = createFileWithBuffer(validBuffer, 'image.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      await POST(request);

      expect(saveRecipeImage).toHaveBeenCalledWith(
        'user123',
        expect.any(String), // UUID
        expect.any(Buffer)
      );
    });

    it('calls getRecipeImageUrl with correct parameters', async () => {
      const validBuffer = createMockImageBuffer('jpeg', 1024);
      const file = createFileWithBuffer(validBuffer, 'image.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      await POST(request);

      expect(getRecipeImageUrl).toHaveBeenCalledWith('user123', expect.any(String));
    });
  });

  describe('error handling', () => {
    it('returns 500 on storage error', async () => {
      vi.mocked(saveRecipeImage).mockRejectedValueOnce(new Error('Storage error'));

      const validBuffer = createMockImageBuffer('jpeg', 1024);
      const file = createFileWithBuffer(validBuffer, 'image.jpg', 'image/jpeg');
      const request = createMockRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload image');
    });
  });
});
