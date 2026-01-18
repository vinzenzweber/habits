/**
 * Tests for grocery list types and row converters
 */

import { describe, it, expect } from 'vitest';
import {
  GROCERY_CATEGORIES,
  rowToGroceryList,
  rowToGroceryListShare,
  rowToGroceryListItem,
} from '../grocery-types';
import {
  createMockGroceryListRow,
  createMockGroceryListShareRow,
  createMockGroceryListItemRow,
  getMockGroceryCategories,
  getMockGroceryPermissions,
} from './fixtures/grocery-fixtures';

describe('grocery-types', () => {
  // ============================================
  // Constants Tests
  // ============================================

  describe('GROCERY_CATEGORIES', () => {
    it('contains all expected categories', () => {
      const expectedCategories = getMockGroceryCategories();
      expect(GROCERY_CATEGORIES).toEqual(expectedCategories);
    });

    it('has exactly 8 categories', () => {
      expect(GROCERY_CATEGORIES.length).toBe(8);
    });

    it('includes produce, dairy, meat, bakery, pantry, frozen, beverages, and other', () => {
      expect(GROCERY_CATEGORIES).toContain('produce');
      expect(GROCERY_CATEGORIES).toContain('dairy');
      expect(GROCERY_CATEGORIES).toContain('meat');
      expect(GROCERY_CATEGORIES).toContain('bakery');
      expect(GROCERY_CATEGORIES).toContain('pantry');
      expect(GROCERY_CATEGORIES).toContain('frozen');
      expect(GROCERY_CATEGORIES).toContain('beverages');
      expect(GROCERY_CATEGORIES).toContain('other');
    });
  });

  describe('Permission types', () => {
    it('has valid permission values', () => {
      const permissions = getMockGroceryPermissions();
      expect(permissions).toEqual(['view', 'edit']);
    });
  });

  // ============================================
  // Row Converter Tests
  // ============================================

  describe('rowToGroceryList', () => {
    it('converts database row to GroceryList', () => {
      const row = createMockGroceryListRow();
      const result = rowToGroceryList(row);

      expect(result.id).toBe(row.id);
      expect(result.ownerUserId).toBe(row.owner_user_id);
      expect(result.name).toBe(row.name);
      expect(result.createdAt).toBe(row.created_at);
      expect(result.updatedAt).toBe(row.updated_at);
    });

    it('preserves all fields from row', () => {
      const row = createMockGroceryListRow({
        id: 42,
        owner_user_id: 7,
        name: 'Custom List Name',
        created_at: new Date('2023-06-15T08:30:00Z'),
        updated_at: new Date('2023-06-16T12:00:00Z'),
      });
      const result = rowToGroceryList(row);

      expect(result.id).toBe(42);
      expect(result.ownerUserId).toBe(7);
      expect(result.name).toBe('Custom List Name');
      expect(result.createdAt).toEqual(new Date('2023-06-15T08:30:00Z'));
      expect(result.updatedAt).toEqual(new Date('2023-06-16T12:00:00Z'));
    });
  });

  describe('rowToGroceryListShare', () => {
    it('converts database row to GroceryListShare', () => {
      const row = createMockGroceryListShareRow();
      const result = rowToGroceryListShare(row);

      expect(result.id).toBe(row.id);
      expect(result.listId).toBe(row.list_id);
      expect(result.sharedWithUserId).toBe(row.shared_with_user_id);
      expect(result.permission).toBe(row.permission);
      expect(result.createdAt).toBe(row.created_at);
    });

    it('handles both view and edit permissions', () => {
      const viewRow = createMockGroceryListShareRow({ permission: 'view' });
      const editRow = createMockGroceryListShareRow({ permission: 'edit' });

      expect(rowToGroceryListShare(viewRow).permission).toBe('view');
      expect(rowToGroceryListShare(editRow).permission).toBe('edit');
    });
  });

  describe('rowToGroceryListItem', () => {
    it('converts database row to GroceryListItem', () => {
      const row = createMockGroceryListItemRow();
      const result = rowToGroceryListItem(row);

      expect(result.id).toBe(row.id);
      expect(result.listId).toBe(row.list_id);
      expect(result.ingredientName).toBe(row.ingredient_name);
      expect(result.quantity).toBe(row.quantity);
      expect(result.unit).toBe(row.unit);
      expect(result.category).toBe(row.category);
      expect(result.checked).toBe(row.checked);
      expect(result.checkedByUserId).toBe(row.checked_by_user_id);
      expect(result.checkedAt).toBe(row.checked_at);
      expect(result.fromRecipeId).toBe(row.from_recipe_id);
      expect(result.position).toBe(row.position);
      expect(result.createdAt).toBe(row.created_at);
      expect(result.updatedAt).toBe(row.updated_at);
    });

    it('handles null values correctly', () => {
      const row = createMockGroceryListItemRow({
        quantity: null,
        unit: null,
        category: null,
        checked_by_user_id: null,
        checked_at: null,
        from_recipe_id: null,
      });
      const result = rowToGroceryListItem(row);

      expect(result.quantity).toBeNull();
      expect(result.unit).toBeNull();
      expect(result.category).toBeNull();
      expect(result.checkedByUserId).toBeNull();
      expect(result.checkedAt).toBeNull();
      expect(result.fromRecipeId).toBeNull();
    });

    it('handles checked items with user attribution', () => {
      const checkedAt = new Date('2024-01-16T15:30:00Z');
      const row = createMockGroceryListItemRow({
        checked: true,
        checked_by_user_id: 3,
        checked_at: checkedAt,
      });
      const result = rowToGroceryListItem(row);

      expect(result.checked).toBe(true);
      expect(result.checkedByUserId).toBe(3);
      expect(result.checkedAt).toBe(checkedAt);
    });

    it('handles all category values', () => {
      const categories = getMockGroceryCategories();

      categories.forEach((category) => {
        const row = createMockGroceryListItemRow({ category });
        const result = rowToGroceryListItem(row);
        expect(result.category).toBe(category);
      });
    });

    it('handles items from recipes', () => {
      const row = createMockGroceryListItemRow({
        from_recipe_id: 42,
        ingredient_name: 'Flour',
        quantity: 200,
        unit: 'g',
      });
      const result = rowToGroceryListItem(row);

      expect(result.fromRecipeId).toBe(42);
      expect(result.ingredientName).toBe('Flour');
      expect(result.quantity).toBe(200);
      expect(result.unit).toBe('g');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge cases', () => {
    it('handles empty ingredient name', () => {
      const row = createMockGroceryListItemRow({ ingredient_name: '' });
      const result = rowToGroceryListItem(row);
      expect(result.ingredientName).toBe('');
    });

    it('handles zero quantity', () => {
      const row = createMockGroceryListItemRow({ quantity: 0 });
      const result = rowToGroceryListItem(row);
      expect(result.quantity).toBe(0);
    });

    it('handles decimal quantity', () => {
      const row = createMockGroceryListItemRow({ quantity: 1.5 });
      const result = rowToGroceryListItem(row);
      expect(result.quantity).toBe(1.5);
    });

    it('handles negative position', () => {
      const row = createMockGroceryListItemRow({ position: -1 });
      const result = rowToGroceryListItem(row);
      expect(result.position).toBe(-1);
    });

    it('handles large position values', () => {
      const row = createMockGroceryListItemRow({ position: 999999 });
      const result = rowToGroceryListItem(row);
      expect(result.position).toBe(999999);
    });
  });
});
