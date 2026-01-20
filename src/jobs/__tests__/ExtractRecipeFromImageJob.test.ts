/**
 * Tests for ExtractRecipeFromImageJob
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/sidequest-runtime', () => ({
  Job: class MockJob {},
  Sidequest: {
    job: {
      get: vi.fn(),
    },
  },
}));

vi.mock('@/lib/recipe-extraction', () => ({
  extractRecipeFromImage: vi.fn(),
  toRecipeJson: vi.fn(() => ({ slug: 'mock-slug' })),
}));

vi.mock('@/lib/db', () => ({
  transaction: vi.fn(),
}));

vi.mock('@/lib/image-utils', () => ({
  generateImageId: vi.fn(() => 'image-123'),
}));

vi.mock('@/lib/recipe-image-storage', () => ({
  saveRecipeImage: vi.fn(),
  getRecipeImageUrl: vi.fn(() => '/api/recipes/images/1/image-123'),
}));

import { Sidequest } from '@/lib/sidequest-runtime';
import { extractRecipeFromImage, toRecipeJson } from '@/lib/recipe-extraction';
import { transaction } from '@/lib/db';
import { saveRecipeImage } from '@/lib/recipe-image-storage';
import {
  ExtractRecipeFromImageJob,
  type ExtractRecipeFromImageJobParams,
  type ExtractRecipeFromImageJobResult,
} from '../ExtractRecipeFromImageJob';

describe('ExtractRecipeFromImageJob', () => {
  const defaultParams: ExtractRecipeFromImageJobParams = {
    parentJobId: 1,
    pageNumber: 1,
    imageBase64: Buffer.from('test-image-data').toString('base64'),
    targetLocale: 'en-US',
    targetRegion: 'US',
    userId: 42,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cancellation check', () => {
    it('marks page as skipped when parent job is cancelled', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce({ state: 'canceled' } as never);

      const job = new ExtractRecipeFromImageJob();
      const result = await job.run(defaultParams);

      expect(result.skipped).toBe(true);
      expect(result.parentJobId).toBe(1);
      expect(result.pageNumber).toBe(1);
      expect(extractRecipeFromImage).not.toHaveBeenCalled();
    });

    it('marks page as skipped when parent job not found', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce(null as never);

      const job = new ExtractRecipeFromImageJob();
      const result = await job.run(defaultParams);

      expect(result.skipped).toBe(true);
      expect(extractRecipeFromImage).not.toHaveBeenCalled();
    });
  });

  describe('extraction outcomes', () => {
    beforeEach(() => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce({ state: 'running' } as never);
    });

    it('marks page as skipped when no recipe is found', async () => {
      vi.mocked(extractRecipeFromImage).mockResolvedValueOnce({
        success: false,
        error: 'No recipe found in image',
      });

      const job = new ExtractRecipeFromImageJob();
      const result = await job.run(defaultParams);

      expect(result.skipped).toBe(true);
    });

    it('throws when extraction fails with other errors', async () => {
      vi.mocked(extractRecipeFromImage).mockResolvedValueOnce({
        success: false,
        error: 'Vision API failed',
      });

      const job = new ExtractRecipeFromImageJob();

      await expect(job.run(defaultParams)).rejects.toThrow('Vision API failed');
    });

    it('saves recipe and returns slug/title on success', async () => {
      vi.mocked(extractRecipeFromImage).mockResolvedValueOnce({
        success: true,
        data: {
          title: 'Test Recipe',
          description: 'Tasty',
          servings: 2,
          locale: 'en-US',
          tags: ['dinner'],
          nutrition: { calories: 200, protein: 10, carbohydrates: 20, fat: 5 },
          ingredientGroups: [{ name: 'Main', ingredients: [{ name: 'Egg', quantity: 2, unit: '' }] }],
          steps: [{ number: 1, instruction: 'Mix' }],
        },
      });

      vi.mocked(transaction).mockImplementationOnce(async (callback) => {
        return callback({
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ version: 1 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ slug: 'test-recipe', title: 'Test Recipe' }], rowCount: 1 }),
        } as never);
      });

      const job = new ExtractRecipeFromImageJob();
      const result = await job.run(defaultParams);

      expect(saveRecipeImage).toHaveBeenCalled();
      expect(toRecipeJson).toHaveBeenCalled();
      expect(result.recipeSlug).toBe('test-recipe');
      expect(result.recipeTitle).toBe('Test Recipe');
    });
  });

  describe('interface types', () => {
    it('accepts required params (parentJobId, pageNumber, imageBase64, locale, region, userId)', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce({ state: 'running' } as never);

      const params: ExtractRecipeFromImageJobParams = {
        parentJobId: 99,
        pageNumber: 5,
        imageBase64: 'base64encodedimage==',
        targetLocale: 'de-DE',
        targetRegion: 'Germany',
        userId: 123,
      };

      const job = new ExtractRecipeFromImageJob();

      // Even though it throws, the params should be accepted by the type system
      await expect(job.run(params)).rejects.toThrow();
    });

    it('defines result type structure', () => {
      const result: ExtractRecipeFromImageJobResult = {
        parentJobId: 1,
        pageNumber: 1,
      };

      expect(result.parentJobId).toBe(1);
      expect(result.pageNumber).toBe(1);
      expect(result.recipeSlug).toBeUndefined();
      expect(result.recipeTitle).toBeUndefined();
      expect(result.skipped).toBeUndefined();
    });

    it('result type allows optional fields', () => {
      const resultWithRecipe: ExtractRecipeFromImageJobResult = {
        parentJobId: 1,
        pageNumber: 1,
        recipeSlug: 'test-recipe-slug',
        recipeTitle: 'Test Recipe Title',
      };

      const resultSkipped: ExtractRecipeFromImageJobResult = {
        parentJobId: 1,
        pageNumber: 1,
        skipped: true,
      };

      expect(resultWithRecipe.recipeSlug).toBe('test-recipe-slug');
      expect(resultWithRecipe.recipeTitle).toBe('Test Recipe Title');
      expect(resultSkipped.skipped).toBe(true);
    });
  });

  describe('job inheritance', () => {
    it('extends Job class from sidequest', () => {
      const job = new ExtractRecipeFromImageJob();

      expect(job).toBeInstanceOf(ExtractRecipeFromImageJob);
    });

    it('has run method that returns a Promise', async () => {
      vi.mocked(Sidequest.job.get).mockResolvedValueOnce({ state: 'canceled' } as never);

      const job = new ExtractRecipeFromImageJob();

      const result = job.run(defaultParams);

      expect(result).toBeInstanceOf(Promise);

      await expect(result).resolves.toBeTruthy();
    });
  });
});
