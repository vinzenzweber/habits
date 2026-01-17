/**
 * Tests for recipe collection data access layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCollection,
  getUserCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  reorderCollectionItems,
  getCollectionRecipes,
  shareCollection,
  getReceivedCollections,
  getSentCollections,
  getUserByEmail,
} from '../collection-db';
import {
  createMockCollectionRow,
  createMockCollectionItemRow,
} from './fixtures/collection-fixtures';
import { createMockRecipeJson } from './fixtures/recipe-fixtures';

// Mock database
vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn() })),
}));

// Mock recipes module for getUniqueSlug
vi.mock('../recipes', () => ({
  getUniqueSlug: vi.fn().mockResolvedValue('test-recipe-slug'),
}));

import { query, transaction } from '../db';

describe('collection-db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Collection CRUD Tests
  // ============================================

  describe('createCollection', () => {
    it('creates a new collection with all fields', async () => {
      const mockRow = createMockCollectionRow({
        name: 'My Recipes',
        description: 'My favorite recipes',
        cover_image_url: 'https://example.com/cover.jpg',
      });
      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRow] });

      const result = await createCollection(1, {
        name: 'My Recipes',
        description: 'My favorite recipes',
        coverImageUrl: 'https://example.com/cover.jpg',
      });

      expect(result.name).toBe('My Recipes');
      expect(result.description).toBe('My favorite recipes');
      expect(result.coverImageUrl).toBe('https://example.com/cover.jpg');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO recipe_collections'),
        [1, 'My Recipes', 'My favorite recipes', 'https://example.com/cover.jpg']
      );
    });

    it('creates a collection with optional fields as null', async () => {
      const mockRow = createMockCollectionRow({
        name: 'Simple Collection',
        description: null,
        cover_image_url: null,
      });
      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRow] });

      const result = await createCollection(1, { name: 'Simple Collection' });

      expect(result.name).toBe('Simple Collection');
      expect(result.description).toBeNull();
      expect(result.coverImageUrl).toBeNull();
    });

    it('throws error when name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(createCollection(1, { name: longName })).rejects.toThrow(
        'Collection name must be 100 characters or less'
      );
      expect(query).not.toHaveBeenCalled();
    });

    it('allows name exactly 100 characters', async () => {
      const exactName = 'a'.repeat(100);
      const mockRow = createMockCollectionRow({ name: exactName });
      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRow] });

      const result = await createCollection(1, { name: exactName });

      expect(result.name).toBe(exactName);
      expect(query).toHaveBeenCalled();
    });
  });

  describe('getUserCollections', () => {
    it('returns collection summaries with recipe counts', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Collection 1',
            description: 'First collection',
            cover_image_url: '/cover1.jpg',
            updated_at: new Date(),
            recipe_count: '5',
          },
          {
            id: 2,
            name: 'Collection 2',
            description: null,
            cover_image_url: null,
            updated_at: new Date(),
            recipe_count: '0',
          },
        ],
      });

      const result = await getUserCollections(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Collection 1');
      expect(result[0].recipeCount).toBe(5);
      expect(result[1].recipeCount).toBe(0);
    });

    it('returns empty array when user has no collections', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getUserCollections(1);
      expect(result).toEqual([]);
    });
  });

  describe('getCollection', () => {
    it('returns collection with recipes when found', async () => {
      const mockCollectionRow = createMockCollectionRow();
      vi.mocked(query)
        // First call: get collection
        .mockResolvedValueOnce({ rows: [mockCollectionRow] })
        // Second call: verify collection ownership in getCollectionRecipes
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        // Third call: get recipes
        .mockResolvedValueOnce({
          rows: [
            {
              slug: 'recipe-1',
              title: 'Recipe 1',
              description: 'Desc 1',
              tags: ['tag1'],
              recipe_json: createMockRecipeJson(),
              updated_at: new Date(),
            },
          ],
        });

      const result = await getCollection(1, 1);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Collection');
      expect(result?.recipes).toHaveLength(1);
      expect(result?.recipeCount).toBe(1);
    });

    it('returns null when collection not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getCollection(1, 999);
      expect(result).toBeNull();
    });
  });

  describe('updateCollection', () => {
    it('updates collection with provided fields', async () => {
      const updatedRow = createMockCollectionRow({
        name: 'Updated Name',
        description: 'Updated description',
      });
      vi.mocked(query).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await updateCollection(1, 1, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(result.name).toBe('Updated Name');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE recipe_collections'),
        expect.arrayContaining([1, 1, 'Updated Name', 'Updated description'])
      );
    });

    it('returns current collection when no updates provided', async () => {
      const mockRow = createMockCollectionRow();
      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRow] });

      const result = await updateCollection(1, 1, {});

      expect(result.name).toBe('Test Collection');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1, 1]
      );
    });

    it('throws error when collection not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      await expect(updateCollection(1, 999, { name: 'New' })).rejects.toThrow(
        'Collection not found'
      );
    });

    it('throws error when name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(updateCollection(1, 1, { name: longName })).rejects.toThrow(
        'Collection name must be 100 characters or less'
      );
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('deleteCollection', () => {
    it('deletes collection successfully', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await deleteCollection(1, 1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM recipe_collections'),
        [1, 1]
      );
    });

    it('throws error when collection not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(deleteCollection(1, 999)).rejects.toThrow('Collection not found');
    });
  });

  // ============================================
  // Recipe Management Tests
  // ============================================

  describe('addRecipeToCollection', () => {
    it('adds recipe to collection at next position', async () => {
      const mockItemRow = createMockCollectionItemRow({ position: 3 });
      const mockClient = {
        query: vi.fn()
          // Check collection ownership
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          // Check recipe ownership
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          // Get max position
          .mockResolvedValueOnce({ rows: [{ max_position: 2 }] })
          // Insert item
          .mockResolvedValueOnce({ rows: [mockItemRow] })
          // Update collection updated_at
          .mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await addRecipeToCollection(1, 1, 1);

      expect(result.position).toBe(3);
    });

    it('throws error when collection not owned by user', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(addRecipeToCollection(1, 999, 1)).rejects.toThrow(
        'Collection not found or not owned by user'
      );
    });

    it('throws error when recipe not owned by user', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // collection found
          .mockResolvedValueOnce({ rows: [] }), // recipe not found
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(addRecipeToCollection(1, 1, 999)).rejects.toThrow(
        'Recipe not found or not owned by user'
      );
    });
  });

  describe('removeRecipeFromCollection', () => {
    it('removes recipe from collection', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // collection check
          .mockResolvedValueOnce({ rowCount: 1 }) // delete item
          .mockResolvedValueOnce({ rows: [] }), // update timestamp
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await removeRecipeFromCollection(1, 1, 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM recipe_collection_items'),
        [1, 1]
      );
    });

    it('throws error when recipe not in collection', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // collection found
          .mockResolvedValueOnce({ rowCount: 0 }), // delete found nothing
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(removeRecipeFromCollection(1, 1, 999)).rejects.toThrow(
        'Recipe not in collection'
      );
    });
  });

  describe('reorderCollectionItems', () => {
    it('updates positions for all recipe IDs using bulk CTE', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // collection check
          .mockResolvedValue({ rows: [] }), // bulk update and updated_at
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await reorderCollectionItems(1, 1, [3, 1, 2]);

      // Verify bulk CTE update (single query for all positions)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH new_positions'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('VALUES (3, 0), (1, 1), (2, 2)'),
        [1]
      );
      // Verify updated_at is updated
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE recipe_collections SET updated_at'),
        [1]
      );
    });

    it('handles empty recipeIds array', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // collection check
          .mockResolvedValue({ rows: [] }), // updated_at
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await reorderCollectionItems(1, 1, []);

      // Should only have collection check and updated_at, no bulk update
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('WITH new_positions'),
        expect.anything()
      );
    });
  });

  describe('getCollectionRecipes', () => {
    it('returns recipes in order by position', async () => {
      const mockRecipeJson = createMockRecipeJson();
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // collection check
        .mockResolvedValueOnce({
          rows: [
            {
              slug: 'recipe-1',
              title: 'Recipe 1',
              description: 'Desc 1',
              tags: ['tag1'],
              recipe_json: mockRecipeJson,
              updated_at: new Date(),
            },
            {
              slug: 'recipe-2',
              title: 'Recipe 2',
              description: null,
              tags: [],
              recipe_json: { ...mockRecipeJson, description: 'JSON desc' },
              updated_at: new Date(),
            },
          ],
        });

      const result = await getCollectionRecipes(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('recipe-1');
      expect(result[1].slug).toBe('recipe-2');
    });

    it('throws error when collection not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      await expect(getCollectionRecipes(1, 999)).rejects.toThrow(
        'Collection not found or not owned by user'
      );
    });
  });

  // ============================================
  // Sharing Tests
  // ============================================

  describe('shareCollection', () => {
    it('copies collection and recipes to recipient', async () => {
      const mockCollectionRow = createMockCollectionRow();
      const mockRecipeJson = createMockRecipeJson();
      const mockClient = {
        query: vi.fn()
          // 1. Get sender's collection
          .mockResolvedValueOnce({ rows: [mockCollectionRow] })
          // 2. Check not already shared
          .mockResolvedValueOnce({ rows: [] })
          // 3. Create copied collection
          .mockResolvedValueOnce({ rows: [{ id: 10 }] })
          // 4. Get recipes in original collection
          .mockResolvedValueOnce({
            rows: [
              {
                recipe_id: 1,
                position: 0,
                slug: 'recipe-1',
                title: 'Recipe 1',
                description: 'Desc',
                locale: 'en-US',
                tags: ['tag1'],
                recipe_json: mockRecipeJson,
              },
            ],
          })
          // 5. Check slug uniqueness for copied recipe
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          // 6. Create copied recipe
          .mockResolvedValueOnce({ rows: [{ id: 100 }] })
          // 7. Add to collection
          .mockResolvedValueOnce({ rows: [] })
          // 8. Mark original as shared
          .mockResolvedValueOnce({ rows: [] })
          // 9. Record the share
          .mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await shareCollection(1, 2, 1, 'Check this out!');

      expect(result.copiedCollectionId).toBe(10);
      expect(result.copiedRecipeIds).toEqual([100]);
    });

    it('throws error when collection not found', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(shareCollection(1, 2, 999)).rejects.toThrow(
        'Collection not found or not owned by sender'
      );
    });

    it('throws error when already shared with recipient', async () => {
      const mockCollectionRow = createMockCollectionRow();
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockCollectionRow] })
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }), // existing share
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(shareCollection(1, 2, 1)).rejects.toThrow(
        'Collection already shared with this user'
      );
    });

    it('throws error when sharing with yourself', async () => {
      // Self-sharing is prevented before any database calls
      await expect(shareCollection(1, 1, 1)).rejects.toThrow(
        'Cannot share collection with yourself'
      );
      // No transaction should be started
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('getReceivedCollections', () => {
    it('returns collections shared with user', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 2, // recipient's copy
            name: 'Shared Collection',
            description: 'From a friend',
            cover_image_url: '/cover.jpg',
            is_shared: false,
            created_at: new Date(),
            updated_at: new Date(),
            sender_id: 1,
            sender_name: 'Friend',
            sender_email: 'friend@example.com',
            message: 'Check these out!',
            shared_at: new Date(),
          },
        ],
      });

      const result = await getReceivedCollections(2);

      expect(result).toHaveLength(1);
      expect(result[0].collection.name).toBe('Shared Collection');
      expect(result[0].sharedBy.name).toBe('Friend');
      expect(result[0].message).toBe('Check these out!');
    });

    it('returns empty array when no shared collections', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getReceivedCollections(2);
      expect(result).toEqual([]);
    });
  });

  describe('getSentCollections', () => {
    it('returns collections user has shared', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 1,
            name: 'My Collection',
            description: 'My recipes',
            cover_image_url: '/cover.jpg',
            is_shared: true,
            created_at: new Date(),
            updated_at: new Date(),
            recipient_id: 2,
            recipient_name: 'Friend',
            recipient_email: 'friend@example.com',
            message: 'Enjoy!',
            shared_at: new Date(),
          },
        ],
      });

      const result = await getSentCollections(1);

      expect(result).toHaveLength(1);
      expect(result[0].collection.name).toBe('My Collection');
      expect(result[0].collection.isShared).toBe(true);
      expect(result[0].sharedWith.name).toBe('Friend');
    });
  });

  describe('getUserByEmail', () => {
    it('returns user when found', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
      });

      const result = await getUserByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test User');
    });

    it('returns null when user not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] });

      const result = await getUserByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // Type Converter Tests
  // ============================================

  describe('rowToCollection', () => {
    it('correctly converts snake_case to camelCase', async () => {
      const row = createMockCollectionRow({
        id: 42,
        user_id: 5,
        name: 'Test',
        description: 'Desc',
        cover_image_url: '/img.jpg',
        is_shared: true,
      });
      vi.mocked(query).mockResolvedValueOnce({ rows: [row] });

      const result = await createCollection(5, { name: 'Test' });

      // The function internally uses rowToCollection
      expect(result.id).toBe(42);
      expect(result.userId).toBe(5);
      expect(result.coverImageUrl).toBe('/img.jpg');
      expect(result.isShared).toBe(true);
    });
  });
});
