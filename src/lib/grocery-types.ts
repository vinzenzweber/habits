/**
 * Grocery list feature types
 * Supports sharing and real-time sync between users
 */

// ============================================
// Permission Types
// ============================================

export type GroceryListPermission = "view" | "edit";

// ============================================
// Item Categories
// ============================================

export const GROCERY_CATEGORIES = [
  "produce", // Obst & Gemüse
  "dairy", // Milchprodukte
  "meat", // Fleisch
  "bakery", // Backwaren
  "pantry", // Vorratskammer
  "frozen", // Tiefkühl
  "beverages", // Getränke
  "other", // Sonstiges
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

// ============================================
// Database Row Types (snake_case)
// ============================================

export interface GroceryListRow {
  id: number;
  owner_user_id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface GroceryListShareRow {
  id: number;
  list_id: number;
  shared_with_user_id: number;
  permission: GroceryListPermission;
  created_at: Date;
}

export interface GroceryListItemRow {
  id: number;
  list_id: number;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory | null;
  checked: boolean;
  checked_by_user_id: number | null;
  checked_at: Date | null;
  from_recipe_id: number | null;
  position: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Application Types (camelCase)
// ============================================

export interface GroceryList {
  id: number;
  ownerUserId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroceryListShare {
  id: number;
  listId: number;
  sharedWithUserId: number;
  permission: GroceryListPermission;
  createdAt: Date;
}

export interface GroceryListItem {
  id: number;
  listId: number;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory | null;
  checked: boolean;
  checkedByUserId: number | null;
  checkedAt: Date | null;
  fromRecipeId: number | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Composite Types (for API responses)
// ============================================

/**
 * Grocery list summary for list views
 */
export interface GroceryListSummary {
  id: number;
  name: string;
  ownerUserId: number;
  ownerName: string;
  itemCount: number;
  checkedCount: number;
  isOwner: boolean;
  permission: GroceryListPermission | "owner";
  updatedAt: Date;
}

/**
 * Full grocery list with items (detail view)
 */
export interface GroceryListWithItems {
  id: number;
  name: string;
  ownerUserId: number;
  ownerName: string;
  isOwner: boolean;
  permission: GroceryListPermission | "owner";
  items: GroceryListItem[];
  shares: GroceryListShareInfo[];
  updatedAt: Date;
}

/**
 * Share info for display (includes user details)
 */
export interface GroceryListShareInfo {
  shareId: number;
  userId: number;
  userName: string;
  userEmail: string;
  permission: GroceryListPermission;
  sharedAt: Date;
}

/**
 * Item with checked-by user info
 */
export interface GroceryItemWithChecker extends GroceryListItem {
  checkedByUserName: string | null;
}

// ============================================
// Input Types
// ============================================

export interface CreateGroceryListInput {
  name: string;
}

export interface CreateGroceryItemInput {
  ingredientName: string;
  quantity?: number;
  unit?: string;
  category?: GroceryCategory;
  fromRecipeId?: number;
  position?: number;
}

export interface UpdateGroceryItemInput {
  ingredientName?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: GroceryCategory | null;
  position?: number;
}

export interface ShareGroceryListInput {
  recipientEmail: string;
  permission?: GroceryListPermission;
}

// ============================================
// Row Converters
// ============================================

export function rowToGroceryList(row: GroceryListRow): GroceryList {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToGroceryListShare(row: GroceryListShareRow): GroceryListShare {
  return {
    id: row.id,
    listId: row.list_id,
    sharedWithUserId: row.shared_with_user_id,
    permission: row.permission,
    createdAt: row.created_at,
  };
}

export function rowToGroceryListItem(row: GroceryListItemRow): GroceryListItem {
  return {
    id: row.id,
    listId: row.list_id,
    ingredientName: row.ingredient_name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    checked: row.checked,
    checkedByUserId: row.checked_by_user_id,
    checkedAt: row.checked_at,
    fromRecipeId: row.from_recipe_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
