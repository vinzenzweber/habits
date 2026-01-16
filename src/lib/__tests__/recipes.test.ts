/**
 * Tests for recipe data access layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserRecipes,
  getRecipeBySlug,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getUniqueSlug,
  slugExists,
  getUserTags,
  getUserRecipeSummaries,
  updateRecipeInPlace,
  getRecipeVersions,
  generateSlug,
} from '../recipes';
import { createMockRecipeJson, createMockRecipe } from './fixtures/recipe-fixtures';
import type { RecipeRow } from '../recipe-types';

// Mock auth
vi.mock('../auth', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn() })),
}));

import { auth } from '../auth';
import { query, transaction } from '../db';

describe('recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('getUserRecipes throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(getUserRecipes()).rejects.toThrow('Not authenticated');
    });

    it('getRecipeBySlug throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(getRecipeBySlug('test-recipe')).rejects.toThrow('Not authenticated');
    });

    it('createRecipe throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const input = { title: 'Test', recipeJson: createMockRecipeJson() };
      await expect(createRecipe(input)).rejects.toThrow('Not authenticated');
    });

    it('updateRecipe throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(updateRecipe('test-slug', { title: 'New Title' })).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('deleteRecipe throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(deleteRecipe('test-slug')).rejects.toThrow('Not authenticated');
    });

    it('getUserTags throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(getUserTags()).rejects.toThrow('Not authenticated');
    });

    it('getUserRecipeSummaries throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(getUserRecipeSummaries()).rejects.toThrow('Not authenticated');
    });

    it('updateRecipeInPlace throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(updateRecipeInPlace('test-slug', { title: 'New' })).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('getRecipeVersions throws when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      await expect(getRecipeVersions('test-slug')).rejects.toThrow('Not authenticated');
    });
  });

  describe('getUserRecipes', () => {
    const mockSession = { user: { id: '123' } };

    it('returns user recipes ordered by updated_at', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      const mockRecipeRow: RecipeRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'Test description',
        locale: 'en-US',
        tags: ['healthy'],
        recipe_json: createMockRecipeJson(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRecipeRow] });

      const recipes = await getUserRecipes();

      expect(recipes).toHaveLength(1);
      expect(recipes[0].title).toBe('Test Recipe');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY updated_at DESC'),
        [123]
      );
    });

    it('returns empty array when user has no recipes', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const recipes = await getUserRecipes();
      expect(recipes).toEqual([]);
    });
  });

  describe('getRecipeBySlug', () => {
    const mockSession = { user: { id: '123' } };

    it('returns recipe when found', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      const mockRecipeRow: RecipeRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'Test description',
        locale: 'en-US',
        tags: ['healthy'],
        recipe_json: createMockRecipeJson(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRecipeRow] });

      const recipe = await getRecipeBySlug('test-recipe');

      expect(recipe).not.toBeNull();
      expect(recipe?.slug).toBe('test-recipe');
    });

    it('returns null when recipe not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const recipe = await getRecipeBySlug('nonexistent');
      expect(recipe).toBeNull();
    });
  });

  describe('createRecipe', () => {
    const mockSession = { user: { id: '123' } };

    it('creates recipe with version 1', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);

      // Mock query for getUniqueSlug's slugExists check - must be set up first
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const mockRecipeRow = {
        id: 1,
        user_id: '123',
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'Test description',
        locale: 'de-DE',
        tags: JSON.stringify([]),
        recipe_json: JSON.stringify(createMockRecipeJson()),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockClient = {
        query: vi.fn()
          // First call: get max version
          .mockResolvedValueOnce({ rows: [{ version: null }] })
          // Second call: deactivate previous versions
          .mockResolvedValueOnce({ rows: [] })
          // Third call: insert new recipe
          .mockResolvedValueOnce({ rows: [mockRecipeRow] }),
      };

      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const input = {
        title: 'Test Recipe',
        description: 'Test description',
        recipeJson: createMockRecipeJson(),
      };

      const recipe = await createRecipe(input);

      expect(recipe.version).toBe(1);
      expect(recipe.title).toBe('Test Recipe');
    });
  });

  describe('updateRecipe', () => {
    const mockSession = { user: { id: '123' } };

    it('creates new version and deactivates old', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);

      const oldRecipeRow: RecipeRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Old Title',
        description: 'Old description',
        locale: 'en-US',
        tags: [],
        recipe_json: createMockRecipeJson({ title: 'Old Title' }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newRecipeRow: RecipeRow = {
        ...oldRecipeRow,
        id: 2,
        version: 2,
        title: 'New Title',
        description: 'New description',
        recipe_json: createMockRecipeJson({ title: 'New Title' }),
      };

      const mockClient = {
        query: vi.fn()
          // Get current recipe
          .mockResolvedValueOnce({ rows: [oldRecipeRow] })
          // Deactivate current version
          .mockResolvedValueOnce({ rows: [] })
          // Insert new version
          .mockResolvedValueOnce({ rows: [newRecipeRow] }),
      };

      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const recipe = await updateRecipe('test-recipe', {
        title: 'New Title',
        description: 'New description',
      });

      expect(recipe.version).toBe(2);
      expect(recipe.title).toBe('New Title');
    });

    it('throws error when recipe not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };

      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(updateRecipe('nonexistent', { title: 'New' })).rejects.toThrow(
        'Recipe not found'
      );
    });
  });

  describe('deleteRecipe', () => {
    const mockSession = { user: { id: '123' } };

    it('sets is_active to false (soft delete)', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      await deleteRecipe('test-recipe');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        [123, 'test-recipe']
      );
    });
  });

  describe('getUniqueSlug', () => {
    it('returns base slug when not taken', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const slug = await getUniqueSlug(123, 'Test Recipe');
      expect(slug).toBe('test-recipe');
    });

    it('appends -2 when base slug is taken', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // base slug exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // -2 doesn't exist

      const slug = await getUniqueSlug(123, 'Test Recipe');
      expect(slug).toBe('test-recipe-2');
    });

    it('increments counter until unique slug found', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // base exists
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // -2 exists
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // -3 exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // -4 doesn't exist

      const slug = await getUniqueSlug(123, 'Test Recipe');
      expect(slug).toBe('test-recipe-4');
    });
  });

  describe('slugExists', () => {
    it('returns true when slug exists', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ count: '1' }] });
      const exists = await slugExists(123, 'test-recipe');
      expect(exists).toBe(true);
    });

    it('returns false when slug does not exist', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ count: '0' }] });
      const exists = await slugExists(123, 'test-recipe');
      expect(exists).toBe(false);
    });
  });

  describe('getUserTags', () => {
    const mockSession = { user: { id: '123' } };

    it('returns unique tags from user recipes', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { tag: 'breakfast' },
          { tag: 'healthy' },
          { tag: 'quick' },
        ],
      });

      const tags = await getUserTags();
      expect(tags).toEqual(['breakfast', 'healthy', 'quick']);
    });

    it('returns empty array when no tags', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const tags = await getUserTags();
      expect(tags).toEqual([]);
    });
  });

  describe('getUserRecipeSummaries', () => {
    const mockSession = { user: { id: '123' } };

    it('returns lightweight summaries', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          slug: 'test-recipe',
          title: 'Test Recipe',
          description: 'Test description',
          tags: ['healthy'],
          servings: 4,
          prep_time_minutes: 15,
          cook_time_minutes: 30,
          images: [{ url: '/img.jpg', isPrimary: true }],
          nutrition: { calories: 500, protein: 25, carbohydrates: 60, fat: 15 },
          recipe_description: 'JSON description',
        }],
      });

      const summaries = await getUserRecipeSummaries();

      expect(summaries).toHaveLength(1);
      expect(summaries[0].slug).toBe('test-recipe');
      expect(summaries[0].primaryImage?.url).toBe('/img.jpg');
    });

    it('falls back to recipe_description when description is null', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          slug: 'test',
          title: 'Test',
          description: null,
          tags: [],
          servings: 2,
          prep_time_minutes: null,
          cook_time_minutes: null,
          images: [{ url: '/img.jpg' }],
          nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
          recipe_description: 'Fallback description',
        }],
      });

      const summaries = await getUserRecipeSummaries();
      expect(summaries[0].description).toBe('Fallback description');
    });
  });

  describe('updateRecipeInPlace', () => {
    const mockSession = { user: { id: '123' } };

    it('updates recipe without creating new version', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      const result = await updateRecipeInPlace('test-slug', { title: 'New Title' });
      expect(result.success).toBe(true);
    });

    it('returns success for empty updates', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);

      const result = await updateRecipeInPlace('test-slug', {});
      expect(result.success).toBe(true);
    });

    it('throws error when recipe not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(updateRecipeInPlace('nonexistent', { title: 'New' })).rejects.toThrow(
        'Recipe not found or inactive'
      );
    });
  });

  describe('getRecipeVersions', () => {
    const mockSession = { user: { id: '123' } };

    it('returns version history', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { version: 2, title: 'Updated', description: 'New desc', created_at: new Date(), is_active: true },
          { version: 1, title: 'Original', description: 'Old desc', created_at: new Date(), is_active: false },
        ],
      });

      const versions = await getRecipeVersions('test-slug');

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2);
      expect(versions[0].isActive).toBe(true);
      expect(versions[1].version).toBe(1);
      expect(versions[1].isActive).toBe(false);
    });

    it('supports pagination with limit and offset', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      await getRecipeVersions('test-slug', { limit: 5, offset: 10 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([123, 'test-slug', 5, 10])
      );
    });
  });

  describe('generateSlug (re-exported)', () => {
    it('generates slug from title', () => {
      expect(generateSlug('Test Recipe')).toBe('test-recipe');
    });
  });
});
