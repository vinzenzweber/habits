/**
 * Tests for exercise image serving API route
 *
 * This endpoint is intentionally public (no authentication required) because:
 * - Exercise images are AI-generated illustrations from a global library
 * - Images are not user-specific data
 * - Keeping this public allows Next.js Image optimization to work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock exercise-library
vi.mock('@/lib/exercise-library', () => ({
  getExerciseWithImages: vi.fn(),
}));

// Mock image-storage
vi.mock('@/lib/image-storage', () => ({
  readExerciseImage: vi.fn(),
}));

import { getExerciseWithImages } from '@/lib/exercise-library';
import { readExerciseImage } from '@/lib/image-storage';

// Helper to create mock request
function createMockRequest(): NextRequest {
  return {} as NextRequest;
}

// Helper to create route params
function createRouteParams(
  name: string,
  index: string
): { params: Promise<{ name: string; index: string }> } {
  return {
    params: Promise.resolve({ name, index }),
  };
}

// Helper to create mock exercise with images
function createMockExercise(images: Array<{
  imageIndex: 1 | 2;
  storagePath: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
}>) {
  return {
    id: 1,
    name: 'Push-ups',
    normalizedName: 'push-ups',
    muscleGroups: ['chest', 'triceps'],
    equipment: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    images: images.map((img, idx) => ({
      id: idx + 1,
      exerciseId: 1,
      ...img,
    })),
  };
}

// Helper to create mock image buffer
function createMockImageBuffer(size: number = 1024): Buffer {
  return Buffer.alloc(size, 0xff);
}

describe('GET /api/exercises/[name]/images/[index]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 for invalid image index (0)', async () => {
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '0');

      const response = await GET(request, params);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid image index. Must be 1 or 2.');
    });

    it('returns 400 for invalid image index (3)', async () => {
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '3');

      const response = await GET(request, params);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid image index. Must be 1 or 2.');
    });

    it('returns 400 for non-numeric image index', async () => {
      const request = createMockRequest();
      const params = createRouteParams('push-ups', 'abc');

      const response = await GET(request, params);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid image index. Must be 1 or 2.');
    });
  });

  describe('exercise lookup', () => {
    it('returns 404 for non-existent exercise', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(null);
      const request = createMockRequest();
      const params = createRouteParams('non-existent-exercise', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Exercise not found');
    });

    it('decodes URL-encoded exercise names', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(null);
      const request = createMockRequest();
      const params = createRouteParams('push%20ups', '1');

      await GET(request, params);

      expect(getExerciseWithImages).toHaveBeenCalledWith('push ups');
    });

    it('handles special characters in exercise names', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(null);
      const request = createMockRequest();
      const params = createRouteParams('90%2F90%20hip%20stretch', '1');

      await GET(request, params);

      expect(getExerciseWithImages).toHaveBeenCalledWith('90/90 hip stretch');
    });
  });

  describe('image record lookup', () => {
    it('returns 404 when image record does not exist for index 1', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 2, storagePath: 'push-ups/image-2.jpg', generationStatus: 'complete' },
        ])
      );
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Image not found');
    });

    it('returns 404 when image record does not exist for index 2', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '2');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Image not found');
    });

    it('returns 404 when exercise has no images at all', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(createMockExercise([]));
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Image not found');
    });
  });

  describe('generation status handling', () => {
    it('returns 503 when image generation is pending', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'pending' },
        ])
      );
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Image generation in progress',
        status: 'pending',
      });
      expect(response.headers.get('Retry-After')).toBe('10');
    });

    it('returns 503 when image generation is in progress', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'generating' },
        ])
      );
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Image generation in progress',
        status: 'generating',
      });
      expect(response.headers.get('Retry-After')).toBe('10');
    });

    it('returns 500 when image generation failed', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'failed' },
        ])
      );
      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Image generation failed',
        status: 'failed',
      });
    });
  });

  describe('successful image retrieval', () => {
    it('returns 200 with image data for index 1', async () => {
      const imageBuffer = createMockImageBuffer(2048);
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(200);
      expect(readExerciseImage).toHaveBeenCalledWith('push-ups/image-1.jpg');
    });

    it('returns 200 with image data for index 2', async () => {
      const imageBuffer = createMockImageBuffer(2048);
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 2, storagePath: 'push-ups/image-2.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '2');

      const response = await GET(request, params);

      expect(response.status).toBe(200);
      expect(readExerciseImage).toHaveBeenCalledWith('push-ups/image-2.jpg');
    });

    it('returns correct Content-Type header', async () => {
      const imageBuffer = createMockImageBuffer();
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    });

    it('returns correct Content-Length header', async () => {
      const imageBuffer = createMockImageBuffer(4096);
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.headers.get('Content-Length')).toBe('4096');
    });

    it('returns cache headers for immutable content', async () => {
      const imageBuffer = createMockImageBuffer();
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    });
  });

  describe('error handling', () => {
    it('returns 404 when image file not found on disk', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Image file not found');
    });

    it('returns 404 when storage read fails for any reason', async () => {
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockRejectedValueOnce(new Error('Storage read error'));

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Image file not found');
    });
  });

  describe('public access (no authentication required)', () => {
    it('serves images without any authentication', async () => {
      const imageBuffer = createMockImageBuffer();
      vi.mocked(getExerciseWithImages).mockResolvedValueOnce(
        createMockExercise([
          { imageIndex: 1, storagePath: 'push-ups/image-1.jpg', generationStatus: 'complete' },
        ])
      );
      vi.mocked(readExerciseImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('push-ups', '1');

      const response = await GET(request, params);

      // Verify image is served successfully without any auth checks
      expect(response.status).toBe(200);
      // Note: No auth mock was set up, demonstrating this endpoint is public
    });
  });
});
