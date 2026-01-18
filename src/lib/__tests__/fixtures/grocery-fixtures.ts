/**
 * Test fixtures for grocery list tests
 * Provides mock factory functions for creating test data
 */

import type {
  GroceryListRow,
  GroceryListShareRow,
  GroceryListItemRow,
  GroceryList,
  GroceryListShare,
  GroceryListItem,
  GroceryListSummary,
  GroceryListWithItems,
  GroceryListShareInfo,
  GroceryListPermission,
  GroceryCategory,
} from '../../grocery-types';

/**
 * Create a mock GroceryListRow (database row)
 */
export function createMockGroceryListRow(overrides?: Partial<GroceryListRow>): GroceryListRow {
  return {
    id: 1,
    owner_user_id: 1,
    name: 'Weekly Groceries',
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListShareRow (database row)
 */
export function createMockGroceryListShareRow(overrides?: Partial<GroceryListShareRow>): GroceryListShareRow {
  return {
    id: 1,
    list_id: 1,
    shared_with_user_id: 2,
    permission: 'edit',
    created_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListItemRow (database row)
 */
export function createMockGroceryListItemRow(overrides?: Partial<GroceryListItemRow>): GroceryListItemRow {
  return {
    id: 1,
    list_id: 1,
    ingredient_name: 'Milk',
    quantity: 2,
    unit: 'liters',
    category: 'dairy',
    checked: false,
    checked_by_user_id: null,
    checked_at: null,
    from_recipe_id: null,
    position: 0,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryList (TypeScript type)
 */
export function createMockGroceryList(overrides?: Partial<GroceryList>): GroceryList {
  return {
    id: 1,
    ownerUserId: 1,
    name: 'Weekly Groceries',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListShare (TypeScript type)
 */
export function createMockGroceryListShare(overrides?: Partial<GroceryListShare>): GroceryListShare {
  return {
    id: 1,
    listId: 1,
    sharedWithUserId: 2,
    permission: 'edit',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListItem (TypeScript type)
 */
export function createMockGroceryListItem(overrides?: Partial<GroceryListItem>): GroceryListItem {
  return {
    id: 1,
    listId: 1,
    ingredientName: 'Milk',
    quantity: 2,
    unit: 'liters',
    category: 'dairy',
    checked: false,
    checkedByUserId: null,
    checkedAt: null,
    fromRecipeId: null,
    position: 0,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListSummary (list view)
 */
export function createMockGroceryListSummary(overrides?: Partial<GroceryListSummary>): GroceryListSummary {
  return {
    id: 1,
    name: 'Weekly Groceries',
    ownerUserId: 1,
    ownerName: 'Test User',
    itemCount: 5,
    checkedCount: 2,
    isOwner: true,
    permission: 'owner',
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListWithItems (detail view)
 */
export function createMockGroceryListWithItems(overrides?: Partial<GroceryListWithItems>): GroceryListWithItems {
  return {
    id: 1,
    name: 'Weekly Groceries',
    ownerUserId: 1,
    ownerName: 'Test User',
    isOwner: true,
    permission: 'owner',
    items: [
      createMockGroceryListItem({ id: 1, ingredientName: 'Milk', position: 0 }),
      createMockGroceryListItem({ id: 2, ingredientName: 'Bread', position: 1, category: 'bakery' }),
    ],
    shares: [],
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock GroceryListShareInfo
 */
export function createMockGroceryListShareInfo(overrides?: Partial<GroceryListShareInfo>): GroceryListShareInfo {
  return {
    shareId: 1,
    userId: 2,
    userName: 'Shared User',
    userEmail: 'shared@example.com',
    permission: 'edit',
    sharedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock user for testing grocery list sharing
 */
export function createMockGroceryUser(overrides?: { id?: number; name?: string; email?: string }) {
  return {
    id: overrides?.id ?? 1,
    name: overrides?.name ?? 'Test User',
    email: overrides?.email ?? 'test@example.com',
  };
}

/**
 * Get all valid grocery categories for testing
 */
export function getMockGroceryCategories(): GroceryCategory[] {
  return ['produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen', 'beverages', 'other'];
}

/**
 * Get all valid grocery list permissions for testing
 */
export function getMockGroceryPermissions(): GroceryListPermission[] {
  return ['view', 'edit'];
}

/**
 * Create a list of mock grocery items for a recipe
 */
export function createMockGroceryItemsFromRecipe(recipeId: number): GroceryListItem[] {
  return [
    createMockGroceryListItem({
      id: 1,
      ingredientName: 'Flour',
      quantity: 200,
      unit: 'g',
      category: 'pantry',
      fromRecipeId: recipeId,
      position: 0,
    }),
    createMockGroceryListItem({
      id: 2,
      ingredientName: 'Sugar',
      quantity: 100,
      unit: 'g',
      category: 'pantry',
      fromRecipeId: recipeId,
      position: 1,
    }),
    createMockGroceryListItem({
      id: 3,
      ingredientName: 'Eggs',
      quantity: 3,
      unit: 'pieces',
      category: 'dairy',
      fromRecipeId: recipeId,
      position: 2,
    }),
  ];
}
