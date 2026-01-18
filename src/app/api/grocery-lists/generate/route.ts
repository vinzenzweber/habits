import { auth } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { createGroceryList } from "@/lib/grocery-db";
import { GroceryListItemRow, rowToGroceryListItem } from "@/lib/grocery-types";
import {
  consolidateIngredients,
  RawIngredient,
} from "@/lib/ingredient-consolidation";
import { getCategoryOrDefault } from "@/lib/ingredient-categorization";
import { RecipeJson } from "@/lib/recipe-types";

export const runtime = "nodejs";

/**
 * Request body for generating a grocery list from recipes
 */
interface GenerateRequest {
  recipeIds: number[];
  servingsMultiplier?: number;
  listName?: string;
  existingListId?: number;
}

/**
 * POST /api/grocery-lists/generate
 * Generate grocery list items from one or more recipes
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);

  try {
    const body = (await request.json()) as GenerateRequest;

    // Validate request
    if (!Array.isArray(body.recipeIds) || body.recipeIds.length === 0) {
      return Response.json(
        { error: "At least one recipe ID is required" },
        { status: 400 }
      );
    }

    if (body.recipeIds.length > 20) {
      return Response.json(
        { error: "Maximum 20 recipes per request" },
        { status: 400 }
      );
    }

    const servingsMultiplier = body.servingsMultiplier ?? 1;
    if (servingsMultiplier <= 0 || servingsMultiplier > 100) {
      return Response.json(
        { error: "Servings multiplier must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Verify user owns all specified recipes
    const recipeResult = await query<{
      id: number;
      recipe_json: RecipeJson;
      title: string;
    }>(
      `SELECT id, recipe_json, title FROM recipes
       WHERE id = ANY($1::int[])
         AND user_id = $2
         AND is_active = true`,
      [body.recipeIds, userId]
    );

    if (recipeResult.rows.length !== body.recipeIds.length) {
      const foundIds = new Set(recipeResult.rows.map((r) => r.id));
      const missingIds = body.recipeIds.filter((id) => !foundIds.has(id));
      return Response.json(
        {
          error: `Recipe(s) not found or access denied: ${missingIds.join(", ")}`,
        },
        { status: 404 }
      );
    }

    // Extract all ingredients from recipes
    const rawIngredients: RawIngredient[] = [];
    let totalOriginalItems = 0;

    for (const recipe of recipeResult.rows) {
      const { ingredientGroups } = recipe.recipe_json;
      for (const group of ingredientGroups) {
        for (const ingredient of group.ingredients) {
          rawIngredients.push({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            recipeId: recipe.id,
          });
          totalOriginalItems++;
        }
      }
    }

    // Consolidate ingredients
    const consolidated = consolidateIngredients(
      rawIngredients,
      servingsMultiplier
    );

    // Categorize ingredients
    for (const item of consolidated) {
      item.category = getCategoryOrDefault(item.name);
    }

    // Create list or use existing
    const result = await transaction(async (client) => {
      let listId: number;
      let listName: string;

      if (body.existingListId) {
        // Verify user can edit this list
        const listResult = await client.query<{ id: number; name: string }>(
          `SELECT gl.id, gl.name FROM grocery_lists gl
           LEFT JOIN grocery_list_shares gls ON gls.list_id = gl.id AND gls.shared_with_user_id = $2
           WHERE gl.id = $1
             AND (gl.owner_user_id = $2 OR (gls.shared_with_user_id = $2 AND gls.permission = 'edit'))`,
          [body.existingListId, userId]
        );

        if (listResult.rows.length === 0) {
          throw new Error("List not found or access denied");
        }

        listId = listResult.rows[0].id;
        listName = listResult.rows[0].name;
      } else {
        // Create new list
        const name =
          body.listName ||
          (recipeResult.rows.length === 1
            ? `${recipeResult.rows[0].title} Shopping List`
            : `Shopping List (${recipeResult.rows.length} recipes)`);

        const newList = await createGroceryList(userId, { name });
        listId = newList.id;
        listName = newList.name;
      }

      // Get current max position
      const posResult = await client.query<{ max_pos: number | null }>(
        `SELECT MAX(position) as max_pos FROM grocery_list_items WHERE list_id = $1`,
        [listId]
      );
      let position = (posResult.rows[0].max_pos ?? -1) + 1;

      // Insert all consolidated items
      const insertedItems: GroceryListItemRow[] = [];
      for (const item of consolidated) {
        // Use first source recipe ID for from_recipe_id
        const fromRecipeId = item.sourceRecipeIds[0] ?? null;

        const insertResult = await client.query<GroceryListItemRow>(
          `INSERT INTO grocery_list_items
             (list_id, ingredient_name, quantity, unit, category, from_recipe_id, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            listId,
            item.name,
            item.quantity,
            item.unit || null,
            item.category,
            fromRecipeId,
            position++,
          ]
        );
        insertedItems.push(insertResult.rows[0]);
      }

      // Update list's updated_at
      await client.query(
        `UPDATE grocery_lists SET updated_at = NOW() WHERE id = $1`,
        [listId]
      );

      return {
        listId,
        listName,
        items: insertedItems.map(rowToGroceryListItem),
      };
    });

    return Response.json({
      listId: result.listId,
      listName: result.listName,
      items: result.items,
      consolidationSummary: {
        totalRecipes: recipeResult.rows.length,
        totalOriginalItems,
        consolidatedItems: consolidated.length,
      },
    });
  } catch (error) {
    console.error("Error generating grocery list:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("access denied")
      ) {
        return Response.json({ error: error.message }, { status: 404 });
      }
    }

    return Response.json(
      { error: "Failed to generate grocery list" },
      { status: 500 }
    );
  }
}
