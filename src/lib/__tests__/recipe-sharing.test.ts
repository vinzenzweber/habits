/**
 * Tests for recipe sharing data access layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findUserByEmail,
  shareRecipe,
  unshareRecipe,
  updateSharePermission,
  getSharedWithMe,
  getMySharedRecipes,
  getSharedRecipeById,
  forkRecipe,
  hasRecipeAccess,
} from '../recipe-sharing';
import { createMockRecipeJson } from './fixtures/recipe-fixtures';
import { createMockRecipeShareRow } from './fixtures/recipe-sharing-fixtures';

// Mock database
vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn() })),
}));

import { query, transaction } from '../db';

describe('recipe-sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // User Lookup Tests
  // ============================================

  describe('findUserByEmail', () => {
    it('returns user when found', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
      });

      const result = await findUserByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test User');
      expect(result?.email).toBe('test@example.com');
    });

    it('returns null when user not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await findUserByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });

    it('normalizes email to lowercase', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
      });

      await findUserByEmail('TEST@EXAMPLE.COM');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });

    it('trims email whitespace', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
      });

      await findUserByEmail('  test@example.com  ');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });
  });

  // ============================================
  // Share Operations Tests
  // ============================================

  describe('shareRecipe', () => {
    it('creates a share record successfully', async () => {
      const mockClient = {
        query: vi.fn()
          // Check recipe ownership
          .mockResolvedValueOnce({ rows: [{ id: 1, slug: 'test-recipe' }] })
          // Check if already shared
          .mockResolvedValueOnce({ rows: [] })
          // Create share
          .mockResolvedValueOnce({ rows: [{ id: 10 }] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await shareRecipe(1, 2, 1, 'view', 'Check this out!');

      expect(result.shareId).toBe(10);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO recipe_shares'),
        [1, 1, 2, 'view', 'Check this out!']
      );
    });

    it('throws error when sharing with yourself', async () => {
      await expect(shareRecipe(1, 1, 1)).rejects.toThrow(
        'Cannot share recipe with yourself'
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('throws error when recipe not found', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(shareRecipe(1, 2, 999)).rejects.toThrow(
        'Recipe not found or not owned by you'
      );
    });

    it('throws error when already shared with user', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1, slug: 'test-recipe' }] })
          .mockResolvedValueOnce({ rows: [{ id: 5 }] }), // Existing share
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(shareRecipe(1, 2, 1)).rejects.toThrow(
        'Recipe already shared with this user'
      );
    });

    it('uses default permission when not specified', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1, slug: 'test-recipe' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 10 }] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await shareRecipe(1, 2, 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO recipe_shares'),
        [1, 1, 2, 'view', null]
      );
    });
  });

  describe('unshareRecipe', () => {
    it('removes share successfully', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await unshareRecipe(1, 10);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM recipe_shares'),
        [10, 1]
      );
    });

    it('throws error when share not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(unshareRecipe(1, 999)).rejects.toThrow(
        'Share not found or you are not the owner'
      );
    });
  });

  describe('updateSharePermission', () => {
    it('updates permission successfully', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await updateSharePermission(1, 10, 'edit');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE recipe_shares'),
        [10, 1, 'edit']
      );
    });

    it('throws error when share not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(updateSharePermission(1, 999, 'edit')).rejects.toThrow(
        'Share not found or you are not the owner'
      );
    });
  });

  // ============================================
  // Query Operations Tests
  // ============================================

  describe('getSharedWithMe', () => {
    it('returns recipes shared with user', async () => {
      const mockRecipeJson = createMockRecipeJson();
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            share_id: 1,
            recipe_id: 1,
            permission: 'view',
            message: 'Check this out!',
            shared_at: new Date('2024-01-15T10:00:00Z'),
            owner_id: 2,
            owner_name: 'Owner',
            owner_email: 'owner@example.com',
            slug: 'test-recipe',
            title: 'Test Recipe',
            description: 'A test recipe',
            tags: ['healthy'],
            version: 2,
            recipe_json: mockRecipeJson,
            updated_at: new Date('2024-01-15T10:00:00Z'),
          },
        ],
      });

      const result = await getSharedWithMe(1);

      expect(result).toHaveLength(1);
      expect(result[0].shareId).toBe(1);
      expect(result[0].recipe.title).toBe('Test Recipe');
      expect(result[0].owner.name).toBe('Owner');
      expect(result[0].currentVersion).toBe(2);
    });

    it('returns empty array when no shared recipes', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getSharedWithMe(1);
      expect(result).toEqual([]);
    });
  });

  describe('getMySharedRecipes', () => {
    it('returns recipes user has shared', async () => {
      const mockRecipeJson = createMockRecipeJson();
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            share_id: 1,
            recipe_id: 1,
            permission: 'view',
            message: 'Enjoy!',
            shared_at: new Date('2024-01-15T10:00:00Z'),
            recipient_id: 2,
            recipient_name: 'Recipient',
            recipient_email: 'recipient@example.com',
            slug: 'my-recipe',
            title: 'My Recipe',
            description: 'My recipe',
            tags: ['quick'],
            recipe_json: mockRecipeJson,
            updated_at: new Date('2024-01-15T10:00:00Z'),
          },
        ],
      });

      const result = await getMySharedRecipes(1);

      expect(result).toHaveLength(1);
      expect(result[0].shareId).toBe(1);
      expect(result[0].recipeSummary.title).toBe('My Recipe');
      expect(result[0].sharedWith.name).toBe('Recipient');
    });

    it('returns empty array when no recipes shared', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getMySharedRecipes(1);
      expect(result).toEqual([]);
    });
  });

  describe('getSharedRecipeById', () => {
    it('returns shared recipe with version history', async () => {
      const mockRecipeJson = createMockRecipeJson();
      const shareRow = createMockRecipeShareRow();

      vi.mocked(query)
        // Get share record
        .mockResolvedValueOnce({
          rows: [{ ...shareRow, owner_name: 'Owner' }],
        })
        // Get recipe
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            slug: 'test-recipe',
            version: 2,
            title: 'Test Recipe',
            description: 'A test recipe',
            locale: 'en-US',
            tags: ['healthy'],
            recipe_json: mockRecipeJson,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        })
        // Get version history
        .mockResolvedValueOnce({
          rows: [
            { version: 2, title: 'Test Recipe', description: 'Updated', created_at: new Date(), is_active: true },
            { version: 1, title: 'Test Recipe', description: 'Original', created_at: new Date(), is_active: false },
          ],
        })
        // Check if forked
        .mockResolvedValueOnce({ rows: [] });

      const result = await getSharedRecipeById(2, 1);

      expect(result).not.toBeNull();
      expect(result?.recipe.title).toBe('Test Recipe');
      expect(result?.versionHistory).toHaveLength(2);
      expect(result?.forkInfo?.alreadyForked).toBe(false);
    });

    it('returns null when not shared with user', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getSharedRecipeById(2, 1);
      expect(result).toBeNull();
    });

    it('returns null when recipe was deleted', async () => {
      const shareRow = createMockRecipeShareRow();
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ ...shareRow, owner_name: 'Owner' }] })
        .mockResolvedValueOnce({ rows: [] }); // No active recipe

      const result = await getSharedRecipeById(2, 1);
      expect(result).toBeNull();
    });

    it('includes fork info when already forked', async () => {
      const mockRecipeJson = createMockRecipeJson();
      const shareRow = createMockRecipeShareRow();

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ ...shareRow, owner_name: 'Owner' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            slug: 'test-recipe',
            version: 1,
            title: 'Test Recipe',
            description: 'A test recipe',
            locale: 'en-US',
            tags: ['healthy'],
            recipe_json: mockRecipeJson,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ version: 1, title: 'Test Recipe', description: 'Desc', created_at: new Date(), is_active: true }] })
        // Already forked
        .mockResolvedValueOnce({ rows: [{ forked_recipe_id: 10 }] })
        // Get forked recipe slug
        .mockResolvedValueOnce({ rows: [{ slug: 'my-forked-recipe' }] });

      const result = await getSharedRecipeById(2, 1);

      expect(result?.forkInfo?.alreadyForked).toBe(true);
      expect(result?.forkInfo?.forkedRecipeSlug).toBe('my-forked-recipe');
    });
  });

  // ============================================
  // Fork Operations Tests
  // ============================================

  describe('forkRecipe', () => {
    it('creates a forked copy successfully', async () => {
      const mockRecipeJson = createMockRecipeJson();
      const mockClient = {
        query: vi.fn()
          // Check share access
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          // Check not already forked
          .mockResolvedValueOnce({ rows: [] })
          // Get original recipe
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              user_id: 1,
              slug: 'original-recipe',
              version: 2,
              title: 'Original Recipe',
              description: 'Original',
              locale: 'en-US',
              tags: ['healthy'],
              recipe_json: mockRecipeJson,
              is_active: true,
            }],
          })
          // Check slug uniqueness
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          // Create forked recipe
          .mockResolvedValueOnce({ rows: [{ id: 100 }] })
          // Record fork
          .mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await forkRecipe(2, 1);

      expect(result.forkedRecipeId).toBe(100);
      expect(result.forkedSlug).toBe('original-recipe');
    });

    it('throws error when recipe not shared with user', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(forkRecipe(2, 1)).rejects.toThrow(
        'Recipe not shared with you'
      );
    });

    it('throws error when already forked', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({ rows: [{ forked_recipe_id: 10 }] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(forkRecipe(2, 1)).rejects.toThrow(
        'You have already forked this recipe'
      );
    });

    it('generates unique slug when original slug exists', async () => {
      const mockRecipeJson = createMockRecipeJson();
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              user_id: 1,
              slug: 'original-recipe',
              version: 1,
              title: 'Original Recipe',
              description: 'Original',
              locale: 'en-US',
              tags: ['healthy'],
              recipe_json: mockRecipeJson,
              is_active: true,
            }],
          })
          // First slug check - exists
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          // Second slug check - doesn't exist
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          .mockResolvedValueOnce({ rows: [{ id: 100 }] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await forkRecipe(2, 1);

      expect(result.forkedSlug).toBe('original-recipe-2');
    });
  });

  // ============================================
  // Permission Check Tests
  // ============================================

  describe('hasRecipeAccess', () => {
    it('returns owner access for recipe owner', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await hasRecipeAccess(1, 1);

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.permission).toBe('admin');
    });

    it('returns shared access for shared user', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [] }) // Not owner
        .mockResolvedValueOnce({ rows: [{ permission: 'edit' }] }); // Shared

      const result = await hasRecipeAccess(2, 1);

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.permission).toBe('edit');
    });

    it('returns no access when not owner or shared', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await hasRecipeAccess(3, 1);

      expect(result.hasAccess).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.permission).toBeNull();
    });
  });

  // ============================================
  // Type Converter Tests
  // ============================================

  describe('Row converters', () => {
    it('correctly handles null message', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          share_id: 1,
          recipe_id: 1,
          permission: 'view',
          message: null,
          shared_at: new Date(),
          owner_id: 1,
          owner_name: 'Owner',
          owner_email: 'owner@example.com',
          slug: 'recipe',
          title: 'Recipe',
          description: null,
          tags: [],
          version: 1,
          recipe_json: createMockRecipeJson(),
          updated_at: new Date(),
        }],
      });

      const result = await getSharedWithMe(2);

      expect(result[0].message).toBeNull();
    });
  });
});
