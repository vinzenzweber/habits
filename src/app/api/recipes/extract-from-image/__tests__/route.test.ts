/**
 * Tests for recipe extraction from image API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock recipe-extraction
vi.mock('@/lib/recipe-extraction', () => ({
  extractRecipeFromImage: vi.fn(),
  toRecipeJson: vi.fn(),
}));

// Mock recipes
vi.mock('@/lib/recipes', () => ({
  createRecipe: vi.fn(),
  getUniqueSlug: vi.fn(),
}));

// Mock recipe-types
vi.mock('@/lib/recipe-types', () => ({
  generateSlug: vi.fn(),
}));

// Mock recipe-image-storage
vi.mock('@/lib/recipe-image-storage', () => ({
  saveRecipeImage: vi.fn().mockResolvedValue({
    storagePath: 'recipes/user123/image456.jpg',
    fileSizeBytes: 1024,
  }),
  getRecipeImageUrl: vi.fn().mockReturnValue('/api/recipes/images/user123/image456'),
}));

// Mock image-utils
vi.mock('@/lib/image-utils', () => ({
  generateImageId: vi.fn().mockReturnValue('image456'),
}));

import { auth } from '@/lib/auth';
import { extractRecipeFromImage, toRecipeJson } from '@/lib/recipe-extraction';
import { createRecipe, getUniqueSlug } from '@/lib/recipes';
import { generateSlug } from '@/lib/recipe-types';
import { saveRecipeImage, getRecipeImageUrl } from '@/lib/recipe-image-storage';

// Sample extracted data
const mockExtractedData = {
  title: 'Test Recipe',
  description: 'A delicious test recipe',
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  locale: 'en-US',
  tags: ['dinner', 'quick'],
  nutrition: {
    calories: 400,
    protein: 25,
    carbohydrates: 35,
    fat: 15,
  },
  ingredientGroups: [
    {
      name: 'Main',
      ingredients: [{ name: 'chicken', quantity: 500, unit: 'g' }],
    },
  ],
  steps: [{ number: 1, instruction: 'Cook' }],
};

// Sample recipe JSON
const mockRecipeJson = {
  slug: 'test-recipe',
  title: 'Test Recipe',
  description: 'A delicious test recipe',
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  locale: 'en-US',
  tags: ['dinner', 'quick'],
  nutrition: mockExtractedData.nutrition,
  ingredientGroups: mockExtractedData.ingredientGroups,
  steps: mockExtractedData.steps,
  images: [{ url: '/api/recipes/images/user123/image456', isPrimary: true }],
  sourceType: 'ai_generated',
};

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown> | null): Request {
  return {
    json: vi.fn().mockResolvedValue(body || {}),
  } as unknown as Request;
}

describe('POST /api/recipes/extract-from-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated
    vi.mocked(auth).mockResolvedValue({
      user: { id: '123', locale: 'en-US' },
    } as never);
    // Default success extraction
    vi.mocked(extractRecipeFromImage).mockResolvedValue({
      success: true,
      data: mockExtractedData,
    });
    vi.mocked(generateSlug).mockReturnValue('test-recipe');
    vi.mocked(getUniqueSlug).mockResolvedValue('test-recipe');
    vi.mocked(toRecipeJson).mockReturnValue(mockRecipeJson);
    vi.mocked(createRecipe).mockResolvedValue({
      id: 1,
      userId: 123,
      slug: 'test-recipe',
      version: 1,
      title: 'Test Recipe',
      description: 'A delicious test recipe',
      locale: 'en-US',
      tags: ['dinner', 'quick'],
      recipeJson: mockRecipeJson,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session has no user ID', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('input validation', () => {
    it('returns 400 when no imageBase64 provided', async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No image data provided');
    });

    it('returns 400 when imageBase64 is not a string', async () => {
      const request = createMockRequest({ imageBase64: 123 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No image data provided');
    });

    it('returns 400 when imageBase64 is too large', async () => {
      // Create a string larger than 15MB
      const largeBase64 = 'a'.repeat(16 * 1024 * 1024);
      const request = createMockRequest({ imageBase64: largeBase64 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Image too large. Please use a smaller image.');
    });
  });

  describe('extraction failure', () => {
    it('returns 400 when extraction fails', async () => {
      vi.mocked(extractRecipeFromImage).mockResolvedValue({
        success: false,
        error: 'This image does not appear to contain a recipe',
      });
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('This image does not appear to contain a recipe');
    });

    it('returns 400 with custom error message from extraction', async () => {
      vi.mocked(extractRecipeFromImage).mockResolvedValue({
        success: false,
        error: 'Image is too blurry to read',
      });
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Image is too blurry to read');
    });
  });

  describe('successful extraction', () => {
    it('returns 201 with slug on success', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.slug).toBe('test-recipe');
    });

    it('calls extractRecipeFromImage with base64 data and user preferences', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(extractRecipeFromImage).toHaveBeenCalledWith('somebase64data', {
        targetLocale: 'en-US',
        targetRegion: expect.any(String),
      });
    });

    it('generates slug from extracted title', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(generateSlug).toHaveBeenCalledWith('Test Recipe');
    });

    it('gets unique slug for user', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(getUniqueSlug).toHaveBeenCalledWith(123, 'test-recipe');
    });

    it('saves image to storage', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(saveRecipeImage).toHaveBeenCalledWith(
        '123',
        'image456',
        expect.any(Buffer)
      );
    });

    it('gets image URL for recipe', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(getRecipeImageUrl).toHaveBeenCalledWith('123', 'image456');
    });

    it('calls toRecipeJson with correct parameters', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(toRecipeJson).toHaveBeenCalledWith(
        mockExtractedData,
        'test-recipe',
        '/api/recipes/images/user123/image456'
      );
    });

    it('creates recipe with correct input', async () => {
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      await POST(request);

      expect(createRecipe).toHaveBeenCalledWith({
        title: 'Test Recipe',
        description: 'A delicious test recipe',
        locale: 'en-US',
        tags: ['dinner', 'quick'],
        recipeJson: mockRecipeJson,
      });
    });
  });

  describe('error handling', () => {
    it('returns 500 on storage error', async () => {
      vi.mocked(saveRecipeImage).mockRejectedValueOnce(new Error('Storage error'));
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to extract recipe. Please try again.');
    });

    it('returns 500 on database error', async () => {
      vi.mocked(createRecipe).mockRejectedValueOnce(new Error('Database error'));
      const request = createMockRequest({ imageBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to extract recipe. Please try again.');
    });
  });
});
