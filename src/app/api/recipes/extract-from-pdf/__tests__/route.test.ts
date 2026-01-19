/**
 * Tests for recipe extraction from PDF API route
 * The route always uses vision API (renders PDF pages to images)
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

// Mock user-preferences
vi.mock('@/lib/user-preferences', () => ({
  getRegionFromTimezone: vi.fn().mockReturnValue('Europe/Vienna'),
}));

// Mock pdf-utils
vi.mock('@/lib/pdf-utils', () => ({
  getPdfInfo: vi.fn(),
  renderPdfPageToImage: vi.fn(),
  MAX_PDF_PAGES: 50,
}));

import { auth } from '@/lib/auth';
import { extractRecipeFromImage, toRecipeJson } from '@/lib/recipe-extraction';
import { createRecipe, getUniqueSlug } from '@/lib/recipes';
import { generateSlug } from '@/lib/recipe-types';
import { getPdfInfo, renderPdfPageToImage } from '@/lib/pdf-utils';

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
  images: [],
  sourceType: 'ai_generated',
};

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown> | null): Request {
  return {
    json: vi.fn().mockResolvedValue(body || {}),
  } as unknown as Request;
}

describe('POST /api/recipes/extract-from-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated
    vi.mocked(auth).mockResolvedValue({
      user: { id: '123', locale: 'en-US' },
    } as never);
    // Default PDF info with one page
    vi.mocked(getPdfInfo).mockResolvedValue({
      pageCount: 1,
    });
    // Default: render returns a PNG buffer
    vi.mocked(renderPdfPageToImage).mockResolvedValue(Buffer.from('fake-png-data'));
    // Default success extraction from vision API
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

  describe('successful extraction', () => {
    it('returns 201 with single recipe on success', async () => {
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(1);
      expect(data.recipes[0].slug).toBe('test-recipe');
      expect(data.extractedCount).toBe(1);
      expect(data.totalPages).toBe(1);
    });

    it('renders PDF page and calls vision API', async () => {
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      await POST(request);

      // Should render the page to an optimized JPEG image
      expect(renderPdfPageToImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        1,  // page number
        expect.objectContaining({
          dpi: 100,
          format: 'jpeg',
          quality: 85,
        })
      );

      // Should call vision API with the base64 image
      expect(extractRecipeFromImage).toHaveBeenCalledWith(
        expect.any(String),  // base64 image data
        expect.objectContaining({
          targetLocale: 'en-US',
        })
      );
    });

    it('extracts recipes from multiple pages', async () => {
      vi.mocked(getPdfInfo).mockResolvedValue({
        pageCount: 2,
      });

      // Return different recipes for each page
      vi.mocked(extractRecipeFromImage)
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockExtractedData, title: 'Recipe 1' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockExtractedData, title: 'Recipe 2' },
        });

      vi.mocked(generateSlug)
        .mockReturnValueOnce('recipe-1')
        .mockReturnValueOnce('recipe-2');

      vi.mocked(getUniqueSlug)
        .mockResolvedValueOnce('recipe-1')
        .mockResolvedValueOnce('recipe-2');

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(2);
      expect(data.extractedCount).toBe(2);
      expect(renderPdfPageToImage).toHaveBeenCalledTimes(2);
    });

    it('skips pages where extraction fails', async () => {
      vi.mocked(getPdfInfo).mockResolvedValue({
        pageCount: 2,
      });

      vi.mocked(extractRecipeFromImage)
        .mockResolvedValueOnce({
          success: true,
          data: mockExtractedData,
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'No recipe found in image',
        });

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(1);
      expect(data.skippedPages).toContain(2);
    });

    it('handles pages where rendering fails', async () => {
      vi.mocked(getPdfInfo).mockResolvedValue({
        pageCount: 2,
      });

      vi.mocked(renderPdfPageToImage)
        .mockResolvedValueOnce(Buffer.from('fake-png-data'))
        .mockRejectedValueOnce(new Error('Rendering failed'));

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(1);
      expect(data.skippedPages).toContain(2);
    });
  });

  describe('extraction passes user preferences', () => {
    it('passes locale and region to extraction', async () => {
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

      expect(extractRecipeFromImage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          targetLocale: 'de-DE',
        })
      );
    });
  });

  describe('image-based PDFs (scanned pages)', () => {
    it('successfully extracts recipes from image-based PDFs using vision', async () => {
      // Image-based PDFs are now handled the same as text PDFs
      // The route renders all pages to images and uses vision API
      vi.mocked(getPdfInfo).mockResolvedValue({
        pageCount: 2,
      });

      vi.mocked(extractRecipeFromImage)
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockExtractedData, title: 'Scanned Recipe 1' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockExtractedData, title: 'Scanned Recipe 2' },
        });

      vi.mocked(generateSlug)
        .mockReturnValueOnce('scanned-recipe-1')
        .mockReturnValueOnce('scanned-recipe-2');

      vi.mocked(getUniqueSlug)
        .mockResolvedValueOnce('scanned-recipe-1')
        .mockResolvedValueOnce('scanned-recipe-2');

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(2);
      expect(data.extractedCount).toBe(2);
      expect(data.skippedPages).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected PDF parsing error', async () => {
      vi.mocked(getPdfInfo).mockRejectedValueOnce(
        new Error('Unexpected error')
      );
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process PDF. Please try again.');
    });

    it('skips page when database error occurs on save', async () => {
      vi.mocked(createRecipe).mockRejectedValue(new Error('Database error'));
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      // Should return 201 with the failed page in skippedPages
      expect(response.status).toBe(201);
      expect(data.skippedPages).toContain(1);
      expect(data.extractedCount).toBe(0);
    });
  });
});
