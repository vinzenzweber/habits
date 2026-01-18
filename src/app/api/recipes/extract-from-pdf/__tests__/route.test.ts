/**
 * Tests for recipe extraction from PDF API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock recipe-extraction
vi.mock('@/lib/recipe-extraction', () => ({
  extractRecipeFromText: vi.fn(),
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
  extractPdfPagesText: vi.fn(),
  MAX_PDF_PAGES: 50,
  MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION: 200,
}));

import { auth } from '@/lib/auth';
import { extractRecipeFromText, toRecipeJson } from '@/lib/recipe-extraction';
import { createRecipe, getUniqueSlug } from '@/lib/recipes';
import { generateSlug } from '@/lib/recipe-types';
import { extractPdfPagesText } from '@/lib/pdf-utils';

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
    // Default success extraction
    vi.mocked(extractRecipeFromText).mockResolvedValue({
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
    // Default PDF info with one page with significant text
    vi.mocked(extractPdfPagesText).mockResolvedValue({
      pageCount: 1,
      totalText: 'Recipe content here with more than 200 characters to be considered significant text. This is a test recipe that includes ingredients like flour, sugar, eggs, and butter. Instructions include mixing and baking.',
      pages: [
        {
          pageNumber: 1,
          textContent: 'Recipe content here with more than 200 characters to be considered significant text. This is a test recipe that includes ingredients like flour, sugar, eggs, and butter. Instructions include mixing and baking.',
          hasSignificantText: true,
        },
      ],
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
      vi.mocked(extractPdfPagesText).mockRejectedValueOnce(
        new Error('password required')
      );
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('This PDF is password-protected. Please provide an unprotected PDF.');
    });

    it('returns 400 when PDF has too many pages', async () => {
      vi.mocked(extractPdfPagesText).mockResolvedValueOnce({
        pageCount: 51,
        totalText: '',
        pages: [],
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

    it('returns extracted recipes from multiple pages', async () => {
      vi.mocked(extractPdfPagesText).mockResolvedValue({
        pageCount: 2,
        totalText: 'Page 1 content\n\nPage 2 content',
        pages: [
          { pageNumber: 1, textContent: 'A'.repeat(250), hasSignificantText: true },
          { pageNumber: 2, textContent: 'B'.repeat(250), hasSignificantText: true },
        ],
      });

      // Return different recipes for each page
      vi.mocked(extractRecipeFromText)
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
    });

    it('skips pages without significant text', async () => {
      vi.mocked(extractPdfPagesText).mockResolvedValue({
        pageCount: 3,
        totalText: 'Short text\n\nLong content with more than 200 chars...',
        pages: [
          { pageNumber: 1, textContent: 'Table of Contents', hasSignificantText: false },
          { pageNumber: 2, textContent: 'A'.repeat(250), hasSignificantText: true },
          { pageNumber: 3, textContent: 'Page 3', hasSignificantText: false },
        ],
      });

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(1);
      expect(data.skippedPages).toContain(1);
      expect(data.skippedPages).toContain(3);
      expect(data.skippedPages).not.toContain(2);
    });

    it('skips pages where extraction fails', async () => {
      vi.mocked(extractPdfPagesText).mockResolvedValue({
        pageCount: 2,
        totalText: 'Content',
        pages: [
          { pageNumber: 1, textContent: 'A'.repeat(250), hasSignificantText: true },
          { pageNumber: 2, textContent: 'B'.repeat(250), hasSignificantText: true },
        ],
      });

      vi.mocked(extractRecipeFromText)
        .mockResolvedValueOnce({
          success: true,
          data: mockExtractedData,
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'No recipe found',
        });

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipes).toHaveLength(1);
      expect(data.skippedPages).toContain(2);
    });

    it('attempts combined extraction when no recipes found on individual pages', async () => {
      vi.mocked(extractPdfPagesText).mockResolvedValue({
        pageCount: 2,
        totalText: 'Combined recipe content with ingredients and steps spread across pages. ' + 'A'.repeat(200),
        pages: [
          { pageNumber: 1, textContent: 'Part 1 short', hasSignificantText: false },
          { pageNumber: 2, textContent: 'Part 2 short', hasSignificantText: false },
        ],
      });

      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // Should have tried combined extraction
      expect(extractRecipeFromText).toHaveBeenCalledWith(
        expect.stringContaining('Combined recipe content'),
        expect.any(Object)
      );
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

      expect(extractRecipeFromText).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          targetLocale: 'de-DE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected PDF parsing error', async () => {
      vi.mocked(extractPdfPagesText).mockRejectedValueOnce(
        new Error('Unexpected error')
      );
      const request = createMockRequest({ pdfBase64: 'somebase64data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process PDF. Please try again.');
    });

    it('skips page when database error occurs on save', async () => {
      // Database errors on individual pages are caught and the page is skipped
      // (for multi-page PDFs, one page failing shouldn't fail the whole request)
      // Mock createRecipe to always reject to prevent combined text extraction from succeeding
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
