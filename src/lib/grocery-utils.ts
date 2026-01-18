/**
 * Utility functions for grocery lists
 */

import { GroceryCategory, GroceryListItem } from "./grocery-types";

// ============================================
// Category Configuration
// ============================================

export const CATEGORY_CONFIG: Record<
  GroceryCategory,
  { icon: string; label: string }
> = {
  produce: { icon: "🥬", label: "Produce" },
  dairy: { icon: "🥛", label: "Dairy" },
  meat: { icon: "🥩", label: "Meat" },
  bakery: { icon: "🍞", label: "Bakery" },
  pantry: { icon: "🥫", label: "Pantry" },
  frozen: { icon: "🧊", label: "Frozen" },
  beverages: { icon: "🥤", label: "Beverages" },
  other: { icon: "📦", label: "Other" },
};

// ============================================
// Formatting Functions
// ============================================

/**
 * Format relative time ("2m ago", "1h ago", "3d ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  // For older dates, show the actual date
  return date.toLocaleDateString();
}

/**
 * Format quantity with unit ("2 lbs", "500 g", "1")
 */
export function formatQuantity(
  quantity: number | null,
  unit: string | null
): string {
  if (quantity === null) {
    return "";
  }
  if (unit === null || unit.trim() === "") {
    return String(quantity);
  }
  return `${quantity} ${unit}`;
}

// ============================================
// Grouping Functions
// ============================================

/**
 * Group items by category for display
 * Returns a Map to preserve insertion order
 */
export function groupItemsByCategory(
  items: GroceryListItem[]
): Map<GroceryCategory | "uncategorized", GroceryListItem[]> {
  const groups = new Map<GroceryCategory | "uncategorized", GroceryListItem[]>();

  // Define category order
  const categoryOrder: (GroceryCategory | "uncategorized")[] = [
    "produce",
    "dairy",
    "meat",
    "bakery",
    "pantry",
    "frozen",
    "beverages",
    "other",
    "uncategorized",
  ];

  // Initialize all groups to maintain order
  for (const category of categoryOrder) {
    groups.set(category, []);
  }

  // Group items
  for (const item of items) {
    const category = item.category ?? "uncategorized";
    const group = groups.get(category);
    if (group) {
      group.push(item);
    }
  }

  // Remove empty groups
  for (const [category, items] of groups) {
    if (items.length === 0) {
      groups.delete(category);
    }
  }

  return groups;
}

/**
 * Get display label for a category
 */
export function getCategoryLabel(
  category: GroceryCategory | "uncategorized"
): string {
  if (category === "uncategorized") {
    return "Uncategorized";
  }
  return CATEGORY_CONFIG[category].label;
}

/**
 * Get icon for a category
 */
export function getCategoryIcon(
  category: GroceryCategory | "uncategorized"
): string {
  if (category === "uncategorized") {
    return "📋";
  }
  return CATEGORY_CONFIG[category].icon;
}
