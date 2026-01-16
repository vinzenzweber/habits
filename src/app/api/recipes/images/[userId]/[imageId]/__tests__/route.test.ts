/**
 * Tests for recipe image serving API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { createMockImageBuffer } from '@/lib/__tests__/fixtures/recipe-fixtures';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock recipe-image-storage
vi.mock('@/lib/recipe-image-storage', () => ({
  readRecipeImage: vi.fn(),
  recipeImageExists: vi.fn(),
  isValidPathComponent: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  readRecipeImage,
  recipeImageExists,
  isValidPathComponent,
} from '@/lib/recipe-image-storage';

// Helper to create mock request
function createMockRequest(): Request {
  return {} as Request;
}

// Helper to create route params
function createRouteParams(
  userId: string,
  imageId: string
): { params: Promise<{ userId: string; imageId: string }> } {
  return {
    params: Promise.resolve({ userId, imageId }),
  };
}

describe('GET /api/recipes/images/[userId]/[imageId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated user matching the request
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user123' },
    } as never);
    // Default to valid path components
    vi.mocked(isValidPathComponent).mockReturnValue(true);
    // Default to image exists
    vi.mocked(recipeImageExists).mockResolvedValue(true);
    // Default to returning a buffer
    vi.mocked(readRecipeImage).mockResolvedValue(createMockImageBuffer('jpeg', 1024));
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('returns 401 when session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('returns 401 when userId does not match session user', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'different-user' },
      } as never);
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });
  });

  describe('path validation', () => {
    it('returns 400 for invalid userId format', async () => {
      // Set the session to match the invalid userId we're testing
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user../etc' },
      } as never);
      vi.mocked(isValidPathComponent)
        .mockReturnValueOnce(false) // userId invalid
        .mockReturnValueOnce(true); // imageId valid

      const request = createMockRequest();
      const params = createRouteParams('user../etc', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid path format');
    });

    it('returns 400 for invalid imageId format', async () => {
      // Clear default mock and set up specific behavior
      vi.mocked(isValidPathComponent).mockReset();
      vi.mocked(isValidPathComponent)
        .mockReturnValueOnce(true) // userId valid
        .mockReturnValueOnce(false); // imageId invalid

      const request = createMockRequest();
      const params = createRouteParams('user123', 'image@456');

      const response = await GET(request, params);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid path format');
    });

    it('validates both userId and imageId', async () => {
      // Clear mock to track calls
      vi.mocked(isValidPathComponent).mockReset();
      vi.mocked(isValidPathComponent).mockReturnValue(true);
      // Also reset image exists to return true
      vi.mocked(recipeImageExists).mockReset();
      vi.mocked(recipeImageExists).mockResolvedValue(true);

      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      await GET(request, params);

      expect(isValidPathComponent).toHaveBeenCalledWith('user123');
      expect(isValidPathComponent).toHaveBeenCalledWith('image456');
    });
  });

  describe('image retrieval', () => {
    it('returns 404 when image does not exist', async () => {
      vi.mocked(recipeImageExists).mockResolvedValueOnce(false);
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Image not found');
    });

    it('checks image existence with correct path', async () => {
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      await GET(request, params);

      expect(recipeImageExists).toHaveBeenCalledWith('recipes/user123/image456.jpg');
    });

    it('reads image with correct path', async () => {
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      await GET(request, params);

      expect(readRecipeImage).toHaveBeenCalledWith('recipes/user123/image456.jpg');
    });
  });

  describe('successful response', () => {
    it('returns 200 with image data', async () => {
      const imageBuffer = createMockImageBuffer('jpeg', 1024);
      vi.mocked(readRecipeImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(200);
    });

    it('returns correct Content-Type header', async () => {
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    });

    it('returns correct Content-Length header', async () => {
      const imageBuffer = createMockImageBuffer('jpeg', 2048);
      vi.mocked(readRecipeImage).mockResolvedValueOnce(imageBuffer);

      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.headers.get('Content-Length')).toBe('2048');
    });

    it('returns cache headers for immutable content', async () => {
      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable'
      );
    });
  });

  describe('error handling', () => {
    it('returns 500 on storage error', async () => {
      vi.mocked(readRecipeImage).mockRejectedValueOnce(new Error('Storage error'));

      const request = createMockRequest();
      const params = createRouteParams('user123', 'image456');

      const response = await GET(request, params);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Internal server error');
    });
  });
});
