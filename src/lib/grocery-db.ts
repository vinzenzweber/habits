/**
 * Grocery list data access layer
 * Supports sharing and real-time sync between users
 */

import { query, transaction } from "./db";
import {
  GroceryListRow,
  GroceryListItemRow,
  GroceryListSummary,
  GroceryListWithItems,
  GroceryListShareInfo,
  GroceryListItem,
  GroceryListPermission,
  CreateGroceryListInput,
  CreateGroceryItemInput,
  UpdateGroceryItemInput,
  rowToGroceryList,
  rowToGroceryListItem,
} from "./grocery-types";

// ============================================
// Constants
// ============================================

const LIST_NAME_MAX_LENGTH = 100;

// ============================================
// Permission Helpers
// ============================================

/**
 * Check if user has access to a list and return their permission level
 */
export async function getUserListPermission(
  userId: number,
  listId: number
): Promise<GroceryListPermission | "owner" | null> {
  // Check if owner
  const ownerResult = await query<{ id: number }>(
    `SELECT id FROM grocery_lists WHERE id = $1 AND owner_user_id = $2`,
    [listId, userId]
  );
  if (ownerResult.rows.length > 0) {
    return "owner";
  }

  // Check if shared with user
  const shareResult = await query<{ permission: GroceryListPermission }>(
    `SELECT permission FROM grocery_list_shares
     WHERE list_id = $1 AND shared_with_user_id = $2`,
    [listId, userId]
  );
  if (shareResult.rows.length > 0) {
    return shareResult.rows[0].permission;
  }

  return null;
}

/**
 * Verify user can edit a list (owner or edit permission)
 */
async function verifyEditAccess(userId: number, listId: number): Promise<void> {
  const permission = await getUserListPermission(userId, listId);
  if (permission === null) {
    throw new Error("Grocery list not found or access denied");
  }
  if (permission === "view") {
    throw new Error("You do not have edit permission for this list");
  }
}

// ============================================
// List Operations
// ============================================

/**
 * Create a new grocery list
 */
export async function createGroceryList(
  userId: number,
  input: CreateGroceryListInput
): Promise<{ id: number; name: string }> {
  if (input.name.length > LIST_NAME_MAX_LENGTH) {
    throw new Error(
      `List name must be ${LIST_NAME_MAX_LENGTH} characters or less`
    );
  }

  const result = await query<GroceryListRow>(
    `INSERT INTO grocery_lists (owner_user_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, input.name.trim()]
  );

  const list = rowToGroceryList(result.rows[0]);
  return { id: list.id, name: list.name };
}

/**
 * Get all grocery lists for a user (owned + shared with them)
 */
export async function getUserGroceryLists(
  userId: number
): Promise<GroceryListSummary[]> {
  const result = await query<{
    id: number;
    name: string;
    owner_user_id: number;
    owner_name: string;
    is_owner: boolean;
    permission: GroceryListPermission | "owner";
    item_count: string;
    checked_count: string;
    updated_at: Date;
  }>(
    `SELECT
      gl.id,
      gl.name,
      gl.owner_user_id,
      u.name as owner_name,
      (gl.owner_user_id = $1) as is_owner,
      CASE
        WHEN gl.owner_user_id = $1 THEN 'owner'
        ELSE gls.permission
      END as permission,
      COUNT(gli.id)::text as item_count,
      COUNT(gli.id) FILTER (WHERE gli.checked = true)::text as checked_count,
      gl.updated_at
     FROM grocery_lists gl
     INNER JOIN users u ON u.id = gl.owner_user_id
     LEFT JOIN grocery_list_shares gls ON gls.list_id = gl.id AND gls.shared_with_user_id = $1
     LEFT JOIN grocery_list_items gli ON gli.list_id = gl.id
     WHERE gl.owner_user_id = $1 OR gls.shared_with_user_id = $1
     GROUP BY gl.id, gl.name, gl.owner_user_id, u.name, gls.permission
     ORDER BY gl.updated_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    isOwner: row.is_owner,
    permission: row.permission,
    itemCount: parseInt(row.item_count, 10),
    checkedCount: parseInt(row.checked_count, 10),
    updatedAt: row.updated_at,
  }));
}

/**
 * Get a single grocery list with all items
 */
export async function getGroceryList(
  userId: number,
  listId: number
): Promise<GroceryListWithItems | null> {
  const permission = await getUserListPermission(userId, listId);
  if (permission === null) {
    return null;
  }

  // Get list details
  const listResult = await query<GroceryListRow & { owner_name: string }>(
    `SELECT gl.*, u.name as owner_name
     FROM grocery_lists gl
     INNER JOIN users u ON u.id = gl.owner_user_id
     WHERE gl.id = $1`,
    [listId]
  );

  if (listResult.rows.length === 0) {
    return null;
  }

  const listRow = listResult.rows[0];

  // Get items
  const itemsResult = await query<GroceryListItemRow>(
    `SELECT * FROM grocery_list_items
     WHERE list_id = $1
     ORDER BY position ASC, created_at ASC`,
    [listId]
  );

  // Get shares (only if owner)
  let shares: GroceryListShareInfo[] = [];
  if (permission === "owner") {
    const sharesResult = await query<{
      share_id: number;
      user_id: number;
      user_name: string;
      user_email: string;
      permission: GroceryListPermission;
      shared_at: Date;
    }>(
      `SELECT
        gls.id as share_id,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        gls.permission,
        gls.created_at as shared_at
       FROM grocery_list_shares gls
       INNER JOIN users u ON u.id = gls.shared_with_user_id
       WHERE gls.list_id = $1
       ORDER BY gls.created_at DESC`,
      [listId]
    );

    shares = sharesResult.rows.map((row) => ({
      shareId: row.share_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      permission: row.permission,
      sharedAt: row.shared_at,
    }));
  }

  return {
    id: listRow.id,
    name: listRow.name,
    ownerUserId: listRow.owner_user_id,
    ownerName: listRow.owner_name,
    isOwner: permission === "owner",
    permission,
    items: itemsResult.rows.map(rowToGroceryListItem),
    shares,
    updatedAt: listRow.updated_at,
  };
}

/**
 * Update grocery list name
 */
export async function updateGroceryList(
  userId: number,
  listId: number,
  name: string
): Promise<void> {
  // Only owner can rename
  const ownerResult = await query<{ id: number }>(
    `SELECT id FROM grocery_lists WHERE id = $1 AND owner_user_id = $2`,
    [listId, userId]
  );
  if (ownerResult.rows.length === 0) {
    throw new Error("List not found or you are not the owner");
  }

  if (name.length > LIST_NAME_MAX_LENGTH) {
    throw new Error(
      `List name must be ${LIST_NAME_MAX_LENGTH} characters or less`
    );
  }

  await query(
    `UPDATE grocery_lists SET name = $2, updated_at = NOW() WHERE id = $1`,
    [listId, name.trim()]
  );
}

/**
 * Delete a grocery list (owner only)
 */
export async function deleteGroceryList(
  userId: number,
  listId: number
): Promise<void> {
  const result = await query(
    `DELETE FROM grocery_lists WHERE id = $1 AND owner_user_id = $2`,
    [listId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error("List not found or you are not the owner");
  }
}

// ============================================
// Item Operations
// ============================================

/**
 * Add an item to a grocery list
 */
export async function addGroceryItem(
  userId: number,
  listId: number,
  item: CreateGroceryItemInput
): Promise<GroceryListItem> {
  await verifyEditAccess(userId, listId);

  // Get max position for the list
  const posResult = await query<{ max_pos: number | null }>(
    `SELECT MAX(position) as max_pos FROM grocery_list_items WHERE list_id = $1`,
    [listId]
  );
  const nextPosition = item.position ?? (posResult.rows[0].max_pos ?? -1) + 1;

  const result = await query<GroceryListItemRow>(
    `INSERT INTO grocery_list_items
       (list_id, ingredient_name, quantity, unit, category, from_recipe_id, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      listId,
      item.ingredientName.trim(),
      item.quantity ?? null,
      item.unit ?? null,
      item.category ?? null,
      item.fromRecipeId ?? null,
      nextPosition,
    ]
  );

  return rowToGroceryListItem(result.rows[0]);
}

/**
 * Toggle item checked status
 */
export async function toggleGroceryItem(
  userId: number,
  itemId: number,
  checked: boolean
): Promise<GroceryListItem> {
  // Get item's list ID first
  const itemResult = await query<{ list_id: number }>(
    `SELECT list_id FROM grocery_list_items WHERE id = $1`,
    [itemId]
  );
  if (itemResult.rows.length === 0) {
    throw new Error("Item not found");
  }

  await verifyEditAccess(userId, itemResult.rows[0].list_id);

  const result = await query<GroceryListItemRow>(
    `UPDATE grocery_list_items
     SET checked = $2,
         checked_by_user_id = CASE WHEN $2 = true THEN $3 ELSE NULL END,
         checked_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [itemId, checked, userId]
  );

  return rowToGroceryListItem(result.rows[0]);
}

/**
 * Update an item
 */
export async function updateGroceryItem(
  userId: number,
  itemId: number,
  updates: UpdateGroceryItemInput
): Promise<GroceryListItem> {
  // Get item's list ID first
  const itemResult = await query<{ list_id: number }>(
    `SELECT list_id FROM grocery_list_items WHERE id = $1`,
    [itemId]
  );
  if (itemResult.rows.length === 0) {
    throw new Error("Item not found");
  }

  await verifyEditAccess(userId, itemResult.rows[0].list_id);

  const setClauses: string[] = ["updated_at = NOW()"];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (updates.ingredientName !== undefined) {
    setClauses.push(`ingredient_name = $${paramIndex++}`);
    values.push(updates.ingredientName.trim());
  }
  if (updates.quantity !== undefined) {
    setClauses.push(`quantity = $${paramIndex++}`);
    values.push(updates.quantity);
  }
  if (updates.unit !== undefined) {
    setClauses.push(`unit = $${paramIndex++}`);
    values.push(updates.unit);
  }
  if (updates.category !== undefined) {
    setClauses.push(`category = $${paramIndex++}`);
    values.push(updates.category);
  }
  if (updates.position !== undefined) {
    setClauses.push(`position = $${paramIndex++}`);
    values.push(updates.position);
  }

  values.push(itemId);

  const result = await query<GroceryListItemRow>(
    `UPDATE grocery_list_items
     SET ${setClauses.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return rowToGroceryListItem(result.rows[0]);
}

/**
 * Remove an item from a list
 */
export async function removeGroceryItem(
  userId: number,
  itemId: number
): Promise<void> {
  // Get item's list ID first
  const itemResult = await query<{ list_id: number }>(
    `SELECT list_id FROM grocery_list_items WHERE id = $1`,
    [itemId]
  );
  if (itemResult.rows.length === 0) {
    throw new Error("Item not found");
  }

  await verifyEditAccess(userId, itemResult.rows[0].list_id);

  await query(`DELETE FROM grocery_list_items WHERE id = $1`, [itemId]);
}

/**
 * Clear all checked items from a list
 */
export async function clearCheckedItems(
  userId: number,
  listId: number
): Promise<number> {
  await verifyEditAccess(userId, listId);

  const result = await query(
    `DELETE FROM grocery_list_items WHERE list_id = $1 AND checked = true`,
    [listId]
  );

  return result.rowCount ?? 0;
}

// ============================================
// Bulk Operations (from recipes)
// ============================================

/**
 * Add all ingredients from a recipe to a grocery list
 */
export async function addRecipeIngredientsToList(
  userId: number,
  listId: number,
  recipeId: number
): Promise<GroceryListItem[]> {
  await verifyEditAccess(userId, listId);

  return transaction(async (client) => {
    // Get recipe ingredients
    const recipeResult = await client.query<{
      recipe_json: {
        ingredientGroups: Array<{
          ingredients: Array<{ name: string; quantity: number; unit: string }>;
        }>;
      };
    }>(
      `SELECT recipe_json FROM recipes WHERE id = $1 AND is_active = true`,
      [recipeId]
    );

    if (recipeResult.rows.length === 0) {
      throw new Error("Recipe not found");
    }

    const { ingredientGroups } = recipeResult.rows[0].recipe_json;
    const allIngredients = ingredientGroups.flatMap((g) => g.ingredients);

    if (allIngredients.length === 0) {
      return [];
    }

    // Get current max position
    const posResult = await client.query<{ max_pos: number | null }>(
      `SELECT MAX(position) as max_pos FROM grocery_list_items WHERE list_id = $1`,
      [listId]
    );
    let position = (posResult.rows[0].max_pos ?? -1) + 1;

    // Insert all ingredients
    const insertedItems: GroceryListItem[] = [];
    for (const ingredient of allIngredients) {
      const result = await client.query<GroceryListItemRow>(
        `INSERT INTO grocery_list_items
           (list_id, ingredient_name, quantity, unit, from_recipe_id, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          listId,
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
          recipeId,
          position++,
        ]
      );
      insertedItems.push(rowToGroceryListItem(result.rows[0]));
    }

    return insertedItems;
  });
}

// ============================================
// Sharing Operations
// ============================================

/**
 * Share a grocery list with another user
 */
export async function shareGroceryList(
  ownerId: number,
  listId: number,
  recipientEmail: string,
  permission: GroceryListPermission = "edit"
): Promise<{ shareId: number }> {
  return transaction(async (client) => {
    // Verify ownership
    const listResult = await client.query<{ id: number }>(
      `SELECT id FROM grocery_lists WHERE id = $1 AND owner_user_id = $2`,
      [listId, ownerId]
    );
    if (listResult.rows.length === 0) {
      throw new Error("List not found or you are not the owner");
    }

    // Find recipient
    const userResult = await client.query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1`,
      [recipientEmail.toLowerCase().trim()]
    );
    if (userResult.rows.length === 0) {
      throw new Error("User not found with that email");
    }

    const recipientId = userResult.rows[0].id;

    // Prevent self-sharing
    if (ownerId === recipientId) {
      throw new Error("Cannot share list with yourself");
    }

    // Check for existing share
    const existingShare = await client.query<{ id: number }>(
      `SELECT id FROM grocery_list_shares WHERE list_id = $1 AND shared_with_user_id = $2`,
      [listId, recipientId]
    );
    if (existingShare.rows.length > 0) {
      throw new Error("List already shared with this user");
    }

    // Create share
    const shareResult = await client.query<{ id: number }>(
      `INSERT INTO grocery_list_shares (list_id, shared_with_user_id, permission)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [listId, recipientId, permission]
    );

    return { shareId: shareResult.rows[0].id };
  });
}

/**
 * Update share permission
 */
export async function updateSharePermission(
  ownerId: number,
  shareId: number,
  permission: GroceryListPermission
): Promise<void> {
  const result = await query(
    `UPDATE grocery_list_shares gls
     SET permission = $3
     FROM grocery_lists gl
     WHERE gls.id = $1
       AND gls.list_id = gl.id
       AND gl.owner_user_id = $2`,
    [shareId, ownerId, permission]
  );

  if (result.rowCount === 0) {
    throw new Error("Share not found or you are not the owner");
  }
}

/**
 * Remove share (unshare)
 */
export async function unshareGroceryList(
  ownerId: number,
  shareId: number
): Promise<void> {
  const result = await query(
    `DELETE FROM grocery_list_shares gls
     USING grocery_lists gl
     WHERE gls.id = $1
       AND gls.list_id = gl.id
       AND gl.owner_user_id = $2`,
    [shareId, ownerId]
  );

  if (result.rowCount === 0) {
    throw new Error("Share not found or you are not the owner");
  }
}

/**
 * Leave a shared list (recipient removes themselves)
 */
export async function leaveSharedList(
  userId: number,
  listId: number
): Promise<void> {
  const result = await query(
    `DELETE FROM grocery_list_shares
     WHERE list_id = $1 AND shared_with_user_id = $2`,
    [listId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error("You are not a member of this shared list");
  }
}

/**
 * Get all shares for a list (owner only)
 */
export async function getListShares(
  ownerId: number,
  listId: number
): Promise<GroceryListShareInfo[]> {
  // Verify ownership
  const listResult = await query<{ id: number }>(
    `SELECT id FROM grocery_lists WHERE id = $1 AND owner_user_id = $2`,
    [listId, ownerId]
  );
  if (listResult.rows.length === 0) {
    throw new Error("List not found or you are not the owner");
  }

  const result = await query<{
    share_id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    permission: GroceryListPermission;
    shared_at: Date;
  }>(
    `SELECT
      gls.id as share_id,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      gls.permission,
      gls.created_at as shared_at
     FROM grocery_list_shares gls
     INNER JOIN users u ON u.id = gls.shared_with_user_id
     WHERE gls.list_id = $1
     ORDER BY gls.created_at DESC`,
    [listId]
  );

  return result.rows.map((row) => ({
    shareId: row.share_id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    permission: row.permission,
    sharedAt: row.shared_at,
  }));
}

// ============================================
// Real-Time Sync Support
// ============================================

/**
 * Get list updated_at timestamp for polling-based sync
 */
export async function getListUpdatedAt(
  userId: number,
  listId: number
): Promise<Date | null> {
  const permission = await getUserListPermission(userId, listId);
  if (permission === null) {
    return null;
  }

  const result = await query<{ updated_at: Date }>(
    `SELECT updated_at FROM grocery_lists WHERE id = $1`,
    [listId]
  );

  return result.rows[0]?.updated_at ?? null;
}

/**
 * Check if list has been updated since a given timestamp
 * Returns the new updated_at if changed, null if not
 */
export async function checkListUpdated(
  userId: number,
  listId: number,
  since: Date
): Promise<{ updated: boolean; updatedAt: Date | null }> {
  const permission = await getUserListPermission(userId, listId);
  if (permission === null) {
    throw new Error("List not found or access denied");
  }

  const result = await query<{ updated_at: Date }>(
    `SELECT updated_at FROM grocery_lists WHERE id = $1`,
    [listId]
  );

  if (result.rows.length === 0) {
    return { updated: false, updatedAt: null };
  }

  const updatedAt = result.rows[0].updated_at;
  return {
    updated: updatedAt > since,
    updatedAt,
  };
}
