/**
 * Ingredient consolidation utilities
 * Handles merging duplicate ingredients, unit conversion, and quantity scaling
 */

import { GroceryCategory } from "./grocery-types";

// ============================================
// Types
// ============================================

export interface RawIngredient {
  name: string;
  quantity: number;
  unit: string;
  recipeId: number;
}

export interface ConsolidatedIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: GroceryCategory | null;
  sourceRecipeIds: number[];
}

// ============================================
// Unit Conversion Constants
// ============================================

// Volume conversions (base unit: ml)
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  tsp: 4.929,
  teaspoon: 4.929,
  teaspoons: 4.929,
  tbsp: 14.787,
  tablespoon: 14.787,
  tablespoons: 14.787,
  cup: 236.588,
  cups: 236.588,
  "fl oz": 29.574,
  "fluid ounce": 29.574,
  "fluid ounces": 29.574,
};

// Weight conversions (base unit: g)
const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

// Count units (items that don't convert)
const COUNT_UNITS = new Set([
  "",
  "pcs",
  "pc",
  "piece",
  "pieces",
  "item",
  "items",
  "whole",
  "slice",
  "slices",
  "clove",
  "cloves",
  "head",
  "heads",
  "bunch",
  "bunches",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "leaf",
  "leaves",
  "can",
  "cans",
  "package",
  "packages",
  "pkg",
  "box",
  "boxes",
  "jar",
  "jars",
  "bottle",
  "bottles",
  "bag",
  "bags",
]);

// ============================================
// Normalization Functions
// ============================================

/**
 * Normalize an ingredient name for comparison
 * - Lowercase
 * - Remove common modifiers (fresh, dried, chopped, etc.)
 * - Singularize common plurals
 * - Trim whitespace
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove common modifiers/adjectives
  const modifiersToRemove = [
    /\b(fresh|dried|frozen|canned|sliced|chopped|diced|minced|grated|shredded)\b/gi,
    /\b(organic|large|medium|small|extra)\b/gi,
    /\b(raw|cooked|boiled|roasted|fried|baked)\b/gi,
    /\b(whole|half|quarter)\b/gi,
  ];

  for (const pattern of modifiersToRemove) {
    normalized = normalized.replace(pattern, "");
  }

  // Clean up multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Normalize a unit string for comparison
 */
export function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

/**
 * Check if two units are compatible for conversion
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const norm1 = normalizeUnit(unit1);
  const norm2 = normalizeUnit(unit2);

  // Same unit
  if (norm1 === norm2) return true;

  // Both volume
  if (VOLUME_TO_ML[norm1] !== undefined && VOLUME_TO_ML[norm2] !== undefined) {
    return true;
  }

  // Both weight
  if (WEIGHT_TO_G[norm1] !== undefined && WEIGHT_TO_G[norm2] !== undefined) {
    return true;
  }

  // Both count
  if (COUNT_UNITS.has(norm1) && COUNT_UNITS.has(norm2)) {
    return true;
  }

  return false;
}

// ============================================
// Conversion Functions
// ============================================

/**
 * Convert a quantity from one unit to another
 * Returns null if conversion is not possible
 */
export function convertUnits(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  // Same unit, no conversion needed
  if (from === to) return quantity;

  // Volume conversion
  if (VOLUME_TO_ML[from] !== undefined && VOLUME_TO_ML[to] !== undefined) {
    const ml = quantity * VOLUME_TO_ML[from];
    return ml / VOLUME_TO_ML[to];
  }

  // Weight conversion
  if (WEIGHT_TO_G[from] !== undefined && WEIGHT_TO_G[to] !== undefined) {
    const g = quantity * WEIGHT_TO_G[from];
    return g / WEIGHT_TO_G[to];
  }

  // Count units - convert to base count
  if (COUNT_UNITS.has(from) && COUNT_UNITS.has(to)) {
    return quantity;
  }

  // Cannot convert between incompatible units
  return null;
}

/**
 * Get the preferred display unit for a unit type
 */
function getPreferredUnit(unit: string): string {
  const norm = normalizeUnit(unit);

  // Volume - prefer ml for small, l for large
  if (VOLUME_TO_ML[norm] !== undefined) {
    return "ml";
  }

  // Weight - prefer g for small, kg for large
  if (WEIGHT_TO_G[norm] !== undefined) {
    return "g";
  }

  // Count - keep original or use empty
  return unit || "";
}

/**
 * Format quantity for display (round to reasonable precision)
 */
function formatQuantity(quantity: number): number {
  // Round to 2 decimal places
  const rounded = Math.round(quantity * 100) / 100;

  // If close to a whole number, round to it
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return Math.round(rounded);
  }

  return rounded;
}

// ============================================
// Consolidation Functions
// ============================================

/**
 * Consolidate multiple ingredients into a merged list
 * - Groups by normalized name
 * - Converts compatible units and sums quantities
 * - Applies servings multiplier
 */
export function consolidateIngredients(
  ingredients: RawIngredient[],
  servingsMultiplier: number = 1
): ConsolidatedIngredient[] {
  // Group by normalized name
  const groups = new Map<string, RawIngredient[]>();

  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, []);
    }
    groups.get(normalizedName)!.push(ingredient);
  }

  // Consolidate each group
  const result: ConsolidatedIngredient[] = [];

  for (const [, group] of groups) {
    // Use the first ingredient's name (preserving original casing)
    const baseName = group[0].name;

    // Collect all unique recipe IDs
    const recipeIds = [...new Set(group.map((i) => i.recipeId))];

    // Try to consolidate quantities
    const consolidated = consolidateQuantities(group, servingsMultiplier);

    for (const item of consolidated) {
      result.push({
        name: baseName,
        quantity: item.quantity,
        unit: item.unit,
        category: null, // Will be set by categorization
        sourceRecipeIds: recipeIds,
      });
    }
  }

  return result;
}

/**
 * Consolidate quantities for ingredients with the same name
 * Groups by compatible units and sums
 */
function consolidateQuantities(
  ingredients: RawIngredient[],
  multiplier: number
): Array<{ quantity: number; unit: string }> {
  // Group by unit compatibility
  const unitGroups: Array<{
    baseUnit: string;
    items: Array<{ quantity: number; unit: string }>;
  }> = [];

  for (const ingredient of ingredients) {
    const scaledQuantity = ingredient.quantity * multiplier;
    let added = false;

    // Try to find a compatible unit group
    for (const group of unitGroups) {
      if (areUnitsCompatible(ingredient.unit, group.baseUnit)) {
        group.items.push({ quantity: scaledQuantity, unit: ingredient.unit });
        added = true;
        break;
      }
    }

    // Create new group if no compatible group found
    if (!added) {
      unitGroups.push({
        baseUnit: ingredient.unit,
        items: [{ quantity: scaledQuantity, unit: ingredient.unit }],
      });
    }
  }

  // Sum each group
  return unitGroups.map((group) => {
    const preferredUnit = getPreferredUnit(group.baseUnit);
    let totalQuantity = 0;

    for (const item of group.items) {
      const converted = convertUnits(item.quantity, item.unit, preferredUnit);
      if (converted !== null) {
        totalQuantity += converted;
      } else {
        // Fallback: just add the raw quantity
        totalQuantity += item.quantity;
      }
    }

    return {
      quantity: formatQuantity(totalQuantity),
      unit: preferredUnit,
    };
  });
}
