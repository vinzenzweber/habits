/**
 * Integration tests for PDF recipe extraction using test-recipes.pdf
 *
 * These tests verify the PDF extraction pipeline works correctly with real PDF data.
 * Tests that involve OpenAI API are separated and mock the recipe-extraction module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTestPdfBuffer,
  getTestPdfImagesBuffer,
  testPdfExists,
  testPdfImagesExists,
  expectedRecipe1,
  expectedRecipe2,
  getAllIngredientNames,
  createMockRecipe1Response,
  createMockRecipe2Response,
} from './fixtures/pdf-fixtures';

import {
  extractPdfPagesText,
  MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION,
} from '../pdf-utils';
import { parseExtractionResponse } from '../recipe-extraction';

describe('PDF Extraction Integration Tests', () => {
  // Skip all tests if the test PDF doesn't exist
  const pdfExists = testPdfExists();
  const pdfImagesExists = testPdfImagesExists();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractPdfPagesText with real PDF', () => {
    it.skipIf(!pdfExists)('should extract 2 pages from test-recipes.pdf', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pageCount).toBe(2);
      expect(result.pages).toHaveLength(2);
    });

    it.skipIf(!pdfExists)('should mark both pages as having significant text', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pages[0].hasSignificantText).toBe(true);
      expect(result.pages[1].hasSignificantText).toBe(true);
      expect(result.pages[0].textContent.length).toBeGreaterThanOrEqual(
        MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION
      );
      expect(result.pages[1].textContent.length).toBeGreaterThanOrEqual(
        MIN_TEXT_LENGTH_FOR_TEXT_EXTRACTION
      );
    });

    it.skipIf(!pdfExists)('should extract text containing recipe 1 title on page 1', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[0].textContent.toLowerCase()).toContain('obstsalat');
      expect(result.pages[0].textContent.toLowerCase()).toContain('kokos');
    });

    it.skipIf(!pdfExists)('should extract text containing recipe 2 title on page 2', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pages[1].pageNumber).toBe(2);
      expect(result.pages[1].textContent.toLowerCase()).toContain('pfirsich');
      expect(result.pages[1].textContent.toLowerCase()).toContain('quark');
    });

    it.skipIf(!pdfExists)('should extract ingredient keywords from page 1', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      const page1Text = result.pages[0].textContent.toLowerCase();
      expect(page1Text).toContain('ananas');
      expect(page1Text).toContain('apfel');
      expect(page1Text).toContain('heidelbeeren');
    });

    it.skipIf(!pdfExists)('should extract ingredient keywords from page 2', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      const page2Text = result.pages[1].textContent.toLowerCase();
      expect(page2Text).toContain('pfirsich');
      expect(page2Text).toContain('mandel');
      expect(page2Text).toContain('joghurt');
    });

    it.skipIf(!pdfExists)('should extract nutrition information from page 1 text', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      const page1Text = result.pages[0].textContent;
      // Should contain calories value (335)
      expect(page1Text).toContain('335');
    });

    it.skipIf(!pdfExists)('should extract nutrition information from page 2 text', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      const page2Text = result.pages[1].textContent;
      // Should contain calories value (295)
      expect(page2Text).toContain('295');
    });

    it.skipIf(!pdfExists)('should have proper page numbering', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[1].pageNumber).toBe(2);
    });

    it.skipIf(!pdfExists)('should have combined total text from all pages', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      // Total text should contain content from both recipes
      expect(result.totalText.toLowerCase()).toContain('obstsalat');
      expect(result.totalText.toLowerCase()).toContain('pfirsich');
    });
  });

  describe('extractPdfPagesText with image-based PDF', () => {
    it.skipIf(!pdfImagesExists)('should extract 2 pages from test-recipes-images.pdf', async () => {
      const pdfBuffer = getTestPdfImagesBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pageCount).toBe(2);
      expect(result.pages).toHaveLength(2);
    });

    it.skipIf(!pdfImagesExists)('should mark pages as having no significant text', async () => {
      const pdfBuffer = getTestPdfImagesBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pages[0].hasSignificantText).toBe(false);
      expect(result.pages[1].hasSignificantText).toBe(false);
    });

    it.skipIf(!pdfImagesExists)('should return empty text content for image-based pages', async () => {
      const pdfBuffer = getTestPdfImagesBuffer();
      const result = await extractPdfPagesText(pdfBuffer);

      expect(result.pages[0].textContent).toBe('');
      expect(result.pages[1].textContent).toBe('');
      expect(result.totalText).toBe('');
    });
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
        expect(result.data.nutrition.carbohydrates).toBe(expectedRecipe1.nutrition.carbohydrates);
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
        expect(result.data.nutrition.carbohydrates).toBe(expectedRecipe2.nutrition.carbohydrates);
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

  describe('Full extraction pipeline verification', () => {
    it.skipIf(!pdfExists)('should extract text from both pages and verify structure', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const pdfInfo = await extractPdfPagesText(pdfBuffer);

      expect(pdfInfo.pages).toHaveLength(2);

      // Verify page 1 contains recipe 1 content
      const page1Text = pdfInfo.pages[0].textContent.toLowerCase();
      expect(page1Text).toContain('obstsalat');
      expect(page1Text).toContain('kokos');
      expect(page1Text).toContain('portionen');
      expect(page1Text).toContain('zubereitung');

      // Verify page 2 contains recipe 2 content
      const page2Text = pdfInfo.pages[1].textContent.toLowerCase();
      expect(page2Text).toContain('pfirsich');
      expect(page2Text).toContain('quark');
      expect(page2Text).toContain('portionen');
      expect(page2Text).toContain('zubereitung');
    });

    it.skipIf(!pdfExists)('should extract prep time values from PDF text', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const pdfInfo = await extractPdfPagesText(pdfBuffer);

      // Recipe 1: 15 minutes
      expect(pdfInfo.pages[0].textContent).toContain('15');

      // Recipe 2: 10 minutes
      expect(pdfInfo.pages[1].textContent).toContain('10');
    });

    it.skipIf(!pdfExists)('should extract serving counts from PDF text', async () => {
      const pdfBuffer = getTestPdfBuffer();
      const pdfInfo = await extractPdfPagesText(pdfBuffer);

      // Both recipes have 2 servings
      expect(pdfInfo.pages[0].textContent).toContain('2');
      expect(pdfInfo.pages[1].textContent).toContain('2');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty PDF buffer gracefully', async () => {
      const emptyBuffer = Buffer.from([]);

      await expect(extractPdfPagesText(emptyBuffer)).rejects.toThrow();
    });

    it('should handle invalid PDF buffer gracefully', async () => {
      const invalidBuffer = Buffer.from('not a valid pdf');

      await expect(extractPdfPagesText(invalidBuffer)).rejects.toThrow();
    });

    it('should handle parseExtractionResponse with error from model', () => {
      const errorResponse = {
        error: 'Could not extract recipe from text',
      };

      const result = parseExtractionResponse(errorResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Could not extract recipe from text');
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
});
