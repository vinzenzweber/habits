/**
 * Recipe filtering and sorting utilities
 * Extracted for easier testing and reuse
 */

import { RecipeSummary } from "./recipe-types";

export type SortOption = "recent" | "alpha" | "rating";

export interface FilterOptions {
  searchQuery?: string;
  selectedTags?: string[];
  favoritesOnly?: boolean;
  sortBy?: SortOption;
}

/**
 * Filter recipes by search query (matches title, description, tags)
 */
export function filterBySearchQuery(
  recipes: RecipeSummary[],
  query: string
): RecipeSummary[] {
  if (!query) return recipes;

  const lowerQuery = query.toLowerCase();
  return recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery) ||
      r.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Filter recipes by tags (AND logic - must match all selected tags)
 */
export function filterByTags(
  recipes: RecipeSummary[],
  tags: string[]
): RecipeSummary[] {
  if (tags.length === 0) return recipes;
  return recipes.filter((r) => tags.every((tag) => r.tags.includes(tag)));
}

/**
 * Filter to only favorites
 */
export function filterByFavorites(recipes: RecipeSummary[]): RecipeSummary[] {
  return recipes.filter((r) => r.isFavorite);
}

/**
 * Sort recipes by the given option
 * Note: 'recent' assumes recipes are already sorted by updated_at DESC from server
 */
export function sortRecipes(
  recipes: RecipeSummary[],
  sortBy: SortOption
): RecipeSummary[] {
  const sorted = [...recipes];

  switch (sortBy) {
    case "alpha":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "rating":
      // Sort by rating descending, null/undefined ratings go last
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
      break;
    case "recent":
      // Already sorted from server, no change needed
      break;
  }

  return sorted;
}

/**
 * Apply all filters and sorting to a list of recipes
 */
export function filterAndSortRecipes(
  recipes: RecipeSummary[],
  options: FilterOptions
): RecipeSummary[] {
  let results = [...recipes];

  // Text search
  if (options.searchQuery) {
    results = filterBySearchQuery(results, options.searchQuery);
  }

  // Tag filtering
  if (options.selectedTags && options.selectedTags.length > 0) {
    results = filterByTags(results, options.selectedTags);
  }

  // Favorites filter
  if (options.favoritesOnly) {
    results = filterByFavorites(results);
  }

  // Sorting
  if (options.sortBy) {
    results = sortRecipes(results, options.sortBy);
  }

  return results;
}

/**
 * Count active filters
 */
export function countActiveFilters(options: FilterOptions): number {
  return (
    (options.searchQuery ? 1 : 0) +
    (options.selectedTags?.length ?? 0) +
    (options.favoritesOnly ? 1 : 0) +
    (options.sortBy && options.sortBy !== "recent" ? 1 : 0)
  );
}
