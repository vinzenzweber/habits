/**
 * Integration tests for PDF recipe extraction using the Vision API approach
 *
 * PDF extraction renders each page to a PNG image using pdftoppm,
 * then sends the image to GPT-4o Vision API for recipe extraction.
 * This is the same approach used for camera photo imports.
 *
 * Tests that require pdftoppm are skipped if the tool is not installed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import {
  getImagePdfBuffer,
  imagePdfExists,
  expectedRecipe1,
  expectedRecipe2,
  getAllIngredientNames,
  createMockRecipe1Response,
  createMockRecipe2Response,
} from './fixtures/pdf-fixtures';

import { renderPdfPageToImage, getPdfInfo } from '../pdf-utils';
import { parseExtractionResponse } from '../recipe-extraction';

// Check if pdftoppm is available for image rendering tests
function pdftoppmAvailable(): boolean {
  try {
    execSync('pdftoppm -v', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('PDF Recipe Extraction (Vision API Approach)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseExtractionResponse with recipe data', () => {
    it('should correctly parse recipe 1 from GPT response', () => {
      const mockResponse = createMockRecipe1Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(expectedRecipe1.title);
        expect(result.data.servings).toBe(expectedRecipe1.servings);
        expect(result.data.prepTimeMinutes).toBe(expectedRecipe1.prepTimeMinutes);
        expect(result.data.locale).toBe(expectedRecipe1.locale);
        expect(result.data.nutrition.calories).toBe(expectedRecipe1.nutrition.calories);
        expect(result.data.nutrition.protein).toBe(expectedRecipe1.nutrition.protein);
        expect(result.data.nutrition.fat).toBe(expectedRecipe1.nutrition.fat);
        expect(result.data.nutrition.carbohydrates).toBe(
          expectedRecipe1.nutrition.carbohydrates
        );
        expect(result.data.steps).toHaveLength(expectedRecipe1.stepCount);
      }
    });

    it('should correctly parse recipe 2 from GPT response', () => {
      const mockResponse = createMockRecipe2Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(expectedRecipe2.title);
        expect(result.data.servings).toBe(expectedRecipe2.servings);
        expect(result.data.prepTimeMinutes).toBe(expectedRecipe2.prepTimeMinutes);
        expect(result.data.locale).toBe(expectedRecipe2.locale);
        expect(result.data.nutrition.calories).toBe(expectedRecipe2.nutrition.calories);
        expect(result.data.nutrition.protein).toBe(expectedRecipe2.nutrition.protein);
        expect(result.data.nutrition.fat).toBe(expectedRecipe2.nutrition.fat);
        expect(result.data.nutrition.carbohydrates).toBe(
          expectedRecipe2.nutrition.carbohydrates
        );
        expect(result.data.steps).toHaveLength(expectedRecipe2.stepCount);
      }
    });

    it('should verify recipe 1 has correct ingredient structure', () => {
      const mockResponse = createMockRecipe1Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        // Check key ingredients are present
        const ingredientNames = getAllIngredientNames(result.data.ingredientGroups);
        expectedRecipe1.expectedIngredients.forEach((ing) => {
          expect(ingredientNames.some((n) => n.includes(ing))).toBe(true);
        });
      }
    });

    it('should verify recipe 2 has correct ingredient structure', () => {
      const mockResponse = createMockRecipe2Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        // Check key ingredients are present
        const ingredientNames = getAllIngredientNames(result.data.ingredientGroups);
        expectedRecipe2.expectedIngredients.forEach((ing) => {
          expect(ingredientNames.some((n) => n.includes(ing))).toBe(true);
        });
      }
    });

    it('should correctly identify ingredient groups in recipe 1', () => {
      const mockResponse = createMockRecipe1Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        // Should have multiple ingredient groups (Obst and Quark)
        expect(result.data.ingredientGroups.length).toBeGreaterThan(1);

        // Each group should have ingredients
        for (const group of result.data.ingredientGroups) {
          expect(group.ingredients.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle German locale detection', () => {
      const mockResponse = createMockRecipe1Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.locale).toBe('de-DE');
      }
    });

    it('should extract nutrition values correctly for recipe 1', () => {
      const mockResponse = createMockRecipe1Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nutrition).toEqual({
          calories: 335,
          protein: 23,
          fat: 13,
          carbohydrates: 30,
        });
      }
    });

    it('should extract nutrition values correctly for recipe 2', () => {
      const mockResponse = createMockRecipe2Response();
      const result = parseExtractionResponse(mockResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nutrition).toEqual({
          calories: 295,
          protein: 24,
          fat: 14,
          carbohydrates: 17,
        });
      }
    });
  });

  describe('Error handling', () => {
    it('should handle parseExtractionResponse with error from model', () => {
      const errorResponse = {
        error: 'Could not extract recipe from image',
      };

      const result = parseExtractionResponse(errorResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Could not extract recipe from image');
      }
    });

    it('should handle parseExtractionResponse with missing title', () => {
      const invalidResponse = {
        description: 'No title provided',
        ingredientGroups: [],
        steps: [],
      };

      const result = parseExtractionResponse(invalidResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('title');
      }
    });

    it('should handle parseExtractionResponse with empty ingredients and steps', () => {
      const invalidResponse = {
        title: 'Empty Recipe',
        description: 'No content',
        ingredientGroups: [],
        steps: [],
      };

      const result = parseExtractionResponse(invalidResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('ingredients');
      }
    });

    it('should handle parseExtractionResponse with null input', () => {
      const result = parseExtractionResponse(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid');
      }
    });

    it('should handle parseExtractionResponse with non-object input', () => {
      const result = parseExtractionResponse('not an object');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid');
      }
    });
  });

  describe('PDF to image rendering (requires pdftoppm)', () => {
    // Skip tests if either the image PDF doesn't exist or pdftoppm isn't installed
    const canRunImageTests = imagePdfExists() && pdftoppmAvailable();

    it.skipIf(!canRunImageTests)(
      'should render PDF page to JPEG using pdftoppm',
      async () => {
        const pdfBuffer = getImagePdfBuffer();

        // Get page count
        const pdfInfo = await getPdfInfo(pdfBuffer);
        expect(pdfInfo.pageCount).toBe(2);

        // Render page 1 with optimized settings (JPEG, 100 DPI)
        const imageBuffer = await renderPdfPageToImage(pdfBuffer, 1, {
          dpi: 100,
          format: 'jpeg',
          quality: 85,
        });

        // Verify it's a JPEG (starts with FFD8FF)
        expect(imageBuffer[0]).toBe(0xff);
        expect(imageBuffer[1]).toBe(0xd8);
        expect(imageBuffer[2]).toBe(0xff);

        // JPEG should be much smaller than PNG (~500KB vs 22MB)
        expect(imageBuffer.length).toBeGreaterThan(50 * 1024);
        expect(imageBuffer.length).toBeLessThan(2 * 1024 * 1024); // Should be under 2MB
      },
      60000 // 1 minute timeout - JPEG rendering is much faster
    );

    it.skipIf(!canRunImageTests)(
      'should render all pages of PDF',
      async () => {
        const pdfBuffer = getImagePdfBuffer();
        const pdfInfo = await getPdfInfo(pdfBuffer);

        // Render both pages with optimized settings
        for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
          const imageBuffer = await renderPdfPageToImage(pdfBuffer, pageNum, {
            dpi: 100,
            format: 'jpeg',
            quality: 85,
          });

          // Verify each is a valid JPEG
          expect(imageBuffer[0]).toBe(0xff);
          expect(imageBuffer[1]).toBe(0xd8);
          expect(imageBuffer.length).toBeGreaterThan(50 * 1024);
        }
      },
      120000 // 2 minute timeout for rendering multiple pages
    );
  });
});
