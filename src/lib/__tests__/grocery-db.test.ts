/**
 * Tests for grocery list data access layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserListPermission,
  createGroceryList,
  getUserGroceryLists,
  getGroceryList,
  updateGroceryList,
  deleteGroceryList,
  addGroceryItem,
  toggleGroceryItem,
  updateGroceryItem,
  removeGroceryItem,
  clearCheckedItems,
  addRecipeIngredientsToList,
  shareGroceryList,
  updateSharePermission,
  unshareGroceryList,
  leaveSharedList,
  getListShares,
  getListUpdatedAt,
  checkListUpdated,
} from '../grocery-db';
import {
  createMockGroceryListRow,
  createMockGroceryListItemRow,
} from './fixtures/grocery-fixtures';
import { createMockRecipeJson } from './fixtures/recipe-fixtures';

// Mock database
vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn() })),
}));

import { query, transaction } from '../db';

describe('grocery-db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Permission Helper Tests
  // ============================================

  describe('getUserListPermission', () => {
    it('returns "owner" when user owns the list', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const result = await getUserListPermission(1, 1);
      expect(result).toBe('owner');
    });

    it('returns share permission when user has access via share', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Not owner
        .mockResolvedValueOnce({ rows: [{ permission: 'edit' }], rowCount: 1 }); // Shared

      const result = await getUserListPermission(2, 1);
      expect(result).toBe('edit');
    });

    it('returns null when user has no access', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await getUserListPermission(3, 1);
      expect(result).toBeNull();
    });
  });

  // ============================================
  // List Operations Tests
  // ============================================

  describe('createGroceryList', () => {
    it('creates a new list successfully', async () => {
      const mockRow = createMockGroceryListRow({ id: 10, name: 'New List' });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      });

      const result = await createGroceryList(1, { name: 'New List' });

      expect(result.id).toBe(10);
      expect(result.name).toBe('New List');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO grocery_lists'),
        [1, 'New List']
      );
    });

    it('trims whitespace from list name', async () => {
      const mockRow = createMockGroceryListRow({ name: 'Trimmed Name' });
      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      });

      await createGroceryList(1, { name: '  Trimmed Name  ' });

      expect(query).toHaveBeenCalledWith(expect.any(String), [1, 'Trimmed Name']);
    });

    it('throws error when name is too long', async () => {
      const longName = 'a'.repeat(101);

      await expect(createGroceryList(1, { name: longName })).rejects.toThrow(
        'List name must be 100 characters or less'
      );
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('getUserGroceryLists', () => {
    it('returns all lists for user (owned and shared)', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'My List',
            owner_user_id: 1,
            owner_name: 'Me',
            is_owner: true,
            permission: 'owner',
            item_count: '5',
            checked_count: '2',
            updated_at: new Date(),
          },
          {
            id: 2,
            name: 'Shared List',
            owner_user_id: 2,
            owner_name: 'Other',
            is_owner: false,
            permission: 'edit',
            item_count: '3',
            checked_count: '1',
            updated_at: new Date(),
          },
        ],
        rowCount: 2,
      });

      const result = await getUserGroceryLists(1);

      expect(result).toHaveLength(2);
      expect(result[0].isOwner).toBe(true);
      expect(result[0].permission).toBe('owner');
      expect(result[0].itemCount).toBe(5);
      expect(result[0].checkedCount).toBe(2);
      expect(result[1].isOwner).toBe(false);
      expect(result[1].permission).toBe('edit');
    });

    it('returns empty array when user has no lists', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await getUserGroceryLists(1);
      expect(result).toEqual([]);
    });
  });

  describe('getGroceryList', () => {
    it('returns list with items for owner', async () => {
      vi.mocked(query)
        // Permission check - owner
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        // List details
        .mockResolvedValueOnce({
          rows: [{ ...createMockGroceryListRow(), owner_name: 'Owner' }],
          rowCount: 1,
        })
        // Items
        .mockResolvedValueOnce({
          rows: [createMockGroceryListItemRow()],
          rowCount: 1,
        })
        // Shares (for owner)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await getGroceryList(1, 1);

      expect(result).not.toBeNull();
      expect(result?.isOwner).toBe(true);
      expect(result?.permission).toBe('owner');
      expect(result?.items).toHaveLength(1);
    });

    it('returns list without shares for shared user', async () => {
      vi.mocked(query)
        // Permission check - not owner
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        // Permission check - shared with edit
        .mockResolvedValueOnce({ rows: [{ permission: 'edit' }], rowCount: 1 })
        // List details
        .mockResolvedValueOnce({
          rows: [{ ...createMockGroceryListRow(), owner_name: 'Owner' }],
          rowCount: 1,
        })
        // Items
        .mockResolvedValueOnce({
          rows: [createMockGroceryListItemRow()],
          rowCount: 1,
        });

      const result = await getGroceryList(2, 1);

      expect(result).not.toBeNull();
      expect(result?.isOwner).toBe(false);
      expect(result?.permission).toBe('edit');
      expect(result?.shares).toEqual([]);
    });

    it('returns null when user has no access', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await getGroceryList(3, 1);
      expect(result).toBeNull();
    });
  });

  describe('updateGroceryList', () => {
    it('updates list name for owner', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Owner check
        .mockResolvedValueOnce({ rowCount: 1 }); // Update

      await updateGroceryList(1, 1, 'New Name');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE grocery_lists'),
        [1, 'New Name']
      );
    });

    it('throws error when not owner', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateGroceryList(2, 1, 'New Name')).rejects.toThrow(
        'List not found or you are not the owner'
      );
    });

    it('throws error when name is too long', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const longName = 'a'.repeat(101);
      await expect(updateGroceryList(1, 1, longName)).rejects.toThrow(
        'List name must be 100 characters or less'
      );
    });
  });

  describe('deleteGroceryList', () => {
    it('deletes list for owner', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await deleteGroceryList(1, 1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM grocery_lists'),
        [1, 1]
      );
    });

    it('throws error when not owner', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(deleteGroceryList(2, 1)).rejects.toThrow(
        'List not found or you are not the owner'
      );
    });
  });

  // ============================================
  // Item Operations Tests
  // ============================================

  describe('addGroceryItem', () => {
    it('adds item to list with edit permission', async () => {
      vi.mocked(query)
        // Owner check
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        // Max position
        .mockResolvedValueOnce({ rows: [{ max_pos: 5 }], rowCount: 1 })
        // Insert
        .mockResolvedValueOnce({
          rows: [createMockGroceryListItemRow({ id: 6, position: 6 })],
          rowCount: 1,
        });

      const result = await addGroceryItem(1, 1, {
        ingredientName: 'New Item',
        quantity: 1,
        unit: 'kg',
        category: 'produce',
      });

      expect(result.position).toBe(6);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO grocery_list_items'),
        expect.arrayContaining(['New Item', 1, 'kg', 'produce'])
      );
    });

    it('uses provided position when specified', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ max_pos: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [createMockGroceryListItemRow({ position: 2 })],
          rowCount: 1,
        });

      const result = await addGroceryItem(1, 1, {
        ingredientName: 'Item',
        position: 2,
      });

      expect(result.position).toBe(2);
    });

    it('throws error when user has view-only permission', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Not owner
        .mockResolvedValueOnce({ rows: [{ permission: 'view' }], rowCount: 1 }); // View only

      await expect(
        addGroceryItem(2, 1, { ingredientName: 'Item' })
      ).rejects.toThrow('You do not have edit permission for this list');
    });
  });

  describe('toggleGroceryItem', () => {
    it('checks an item and records user', async () => {
      vi.mocked(query)
        // Get item's list
        .mockResolvedValueOnce({ rows: [{ list_id: 1 }], rowCount: 1 })
        // Permission check - owner
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        // Update item
        .mockResolvedValueOnce({
          rows: [
            createMockGroceryListItemRow({
              checked: true,
              checked_by_user_id: 1,
              checked_at: new Date(),
            }),
          ],
          rowCount: 1,
        });

      const result = await toggleGroceryItem(1, 1, true);

      expect(result.checked).toBe(true);
      expect(result.checkedByUserId).toBe(1);
      expect(result.checkedAt).not.toBeNull();
    });

    it('unchecks an item and clears user attribution', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ list_id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            createMockGroceryListItemRow({
              checked: false,
              checked_by_user_id: null,
              checked_at: null,
            }),
          ],
          rowCount: 1,
        });

      const result = await toggleGroceryItem(1, 1, false);

      expect(result.checked).toBe(false);
      expect(result.checkedByUserId).toBeNull();
      expect(result.checkedAt).toBeNull();
    });

    it('throws error when item not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(toggleGroceryItem(1, 999, true)).rejects.toThrow(
        'Item not found'
      );
    });
  });

  describe('updateGroceryItem', () => {
    it('updates item fields', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ list_id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            createMockGroceryListItemRow({
              ingredient_name: 'Updated Item',
              quantity: 5,
            }),
          ],
          rowCount: 1,
        });

      const result = await updateGroceryItem(1, 1, {
        ingredientName: 'Updated Item',
        quantity: 5,
      });

      expect(result.ingredientName).toBe('Updated Item');
      expect(result.quantity).toBe(5);
    });

    it('can set nullable fields to null', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ list_id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            createMockGroceryListItemRow({
              quantity: null,
              unit: null,
              category: null,
            }),
          ],
          rowCount: 1,
        });

      const result = await updateGroceryItem(1, 1, {
        quantity: null,
        unit: null,
        category: null,
      });

      expect(result.quantity).toBeNull();
      expect(result.unit).toBeNull();
      expect(result.category).toBeNull();
    });
  });

  describe('removeGroceryItem', () => {
    it('removes item from list', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ list_id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      await removeGroceryItem(1, 1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM grocery_list_items'),
        [1]
      );
    });

    it('throws error when item not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(removeGroceryItem(1, 999)).rejects.toThrow('Item not found');
    });
  });

  describe('clearCheckedItems', () => {
    it('clears all checked items from list', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Owner check
        .mockResolvedValueOnce({ rowCount: 3 }); // Delete 3 items

      const result = await clearCheckedItems(1, 1);

      expect(result).toBe(3);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM grocery_list_items'),
        [1]
      );
    });
  });

  // ============================================
  // Bulk Operations Tests
  // ============================================

  describe('addRecipeIngredientsToList', () => {
    it('adds all ingredients from recipe to list', async () => {
      const mockRecipeJson = createMockRecipeJson();
      const mockClient = {
        query: vi
          .fn()
          // Get recipe
          .mockResolvedValueOnce({
            rows: [{ recipe_json: mockRecipeJson }],
            rowCount: 1,
          })
          // Get max position
          .mockResolvedValueOnce({ rows: [{ max_pos: 0 }], rowCount: 1 })
          // Insert ingredients (3 ingredients from default mock)
          .mockResolvedValueOnce({
            rows: [createMockGroceryListItemRow({ id: 1, position: 1 })],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [createMockGroceryListItemRow({ id: 2, position: 2 })],
            rowCount: 1,
          }),
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // Owner check

      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await addRecipeIngredientsToList(1, 1, 1);

      expect(result.length).toBeGreaterThan(0);
    });

    it('throws error when recipe not found', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
      };

      vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(addRecipeIngredientsToList(1, 1, 999)).rejects.toThrow(
        'Recipe not found'
      );
    });
  });

  // ============================================
  // Sharing Operations Tests
  // ============================================

  describe('shareGroceryList', () => {
    it('shares list with another user', async () => {
      const mockClient = {
        query: vi
          .fn()
          // Verify ownership
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
          // Find recipient
          .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 })
          // Check existing share
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          // Create share
          .mockResolvedValueOnce({ rows: [{ id: 10 }], rowCount: 1 }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      const result = await shareGroceryList(1, 1, 'other@example.com', 'edit');

      expect(result.shareId).toBe(10);
    });

    it('throws error when sharing with yourself', async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }), // Same user
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(
        shareGroceryList(1, 1, 'self@example.com', 'edit')
      ).rejects.toThrow('Cannot share list with yourself');
    });

    it('throws error when list not owned', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(
        shareGroceryList(2, 1, 'other@example.com', 'edit')
      ).rejects.toThrow('List not found or you are not the owner');
    });

    it('throws error when recipient not found', async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }), // No recipient
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(
        shareGroceryList(1, 1, 'nonexistent@example.com', 'edit')
      ).rejects.toThrow('User not found with that email');
    });

    it('throws error when already shared', async () => {
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 }), // Existing share
      };
      vi.mocked(transaction).mockImplementation((fn) => fn(mockClient));

      await expect(
        shareGroceryList(1, 1, 'other@example.com', 'edit')
      ).rejects.toThrow('List already shared with this user');
    });
  });

  describe('updateSharePermission', () => {
    it('updates share permission', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await updateSharePermission(1, 10, 'view');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE grocery_list_shares'),
        [10, 1, 'view']
      );
    });

    it('throws error when share not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(updateSharePermission(1, 999, 'view')).rejects.toThrow(
        'Share not found or you are not the owner'
      );
    });
  });

  describe('unshareGroceryList', () => {
    it('removes share', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await unshareGroceryList(1, 10);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM grocery_list_shares'),
        [10, 1]
      );
    });

    it('throws error when share not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(unshareGroceryList(1, 999)).rejects.toThrow(
        'Share not found or you are not the owner'
      );
    });
  });

  describe('leaveSharedList', () => {
    it('removes user from shared list', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 });

      await leaveSharedList(2, 1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM grocery_list_shares'),
        [1, 2]
      );
    });

    it('throws error when not a member', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 });

      await expect(leaveSharedList(3, 1)).rejects.toThrow(
        'You are not a member of this shared list'
      );
    });
  });

  describe('getListShares', () => {
    it('returns all shares for a list', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Owner check
        .mockResolvedValueOnce({
          rows: [
            {
              share_id: 1,
              user_id: 2,
              user_name: 'User 2',
              user_email: 'user2@example.com',
              permission: 'edit',
              shared_at: new Date(),
            },
          ],
          rowCount: 1,
        });

      const result = await getListShares(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe('User 2');
      expect(result[0].permission).toBe('edit');
    });

    it('throws error when not owner', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getListShares(2, 1)).rejects.toThrow(
        'List not found or you are not the owner'
      );
    });
  });

  // ============================================
  // Real-Time Sync Tests
  // ============================================

  describe('getListUpdatedAt', () => {
    it('returns updated_at for accessible list', async () => {
      const updatedAt = new Date('2024-01-16T10:00:00Z');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Owner check
        .mockResolvedValueOnce({ rows: [{ updated_at: updatedAt }], rowCount: 1 });

      const result = await getListUpdatedAt(1, 1);

      expect(result).toEqual(updatedAt);
    });

    it('returns null when no access', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await getListUpdatedAt(3, 1);
      expect(result).toBeNull();
    });
  });

  describe('checkListUpdated', () => {
    it('returns updated:true when list has changed', async () => {
      const since = new Date('2024-01-15T10:00:00Z');
      const newUpdatedAt = new Date('2024-01-16T10:00:00Z');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Owner check
        .mockResolvedValueOnce({ rows: [{ updated_at: newUpdatedAt }], rowCount: 1 });

      const result = await checkListUpdated(1, 1, since);

      expect(result.updated).toBe(true);
      expect(result.updatedAt).toEqual(newUpdatedAt);
    });

    it('returns updated:false when list has not changed', async () => {
      const since = new Date('2024-01-16T10:00:00Z');
      const updatedAt = new Date('2024-01-15T10:00:00Z');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ updated_at: updatedAt }], rowCount: 1 });

      const result = await checkListUpdated(1, 1, since);

      expect(result.updated).toBe(false);
    });

    it('throws error when no access', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        checkListUpdated(3, 1, new Date())
      ).rejects.toThrow('List not found or access denied');
    });
  });
});
