import { describe, it, expect } from "vitest";

import { RecipeSummary } from "../recipe-types";
import {
  filterBySearchQuery,
  filterByTags,
  filterByFavorites,
  sortRecipes,
  filterAndSortRecipes,
  countActiveFilters,
} from "../recipe-filter-utils";

// ============================================
// Test Data
// ============================================

const createMockRecipe = (overrides: Partial<RecipeSummary>): RecipeSummary => ({
  slug: "test-recipe",
  title: "Test Recipe",
  description: "A delicious test recipe",
  tags: [],
  servings: 4,
  nutrition: {
    calories: 500,
    protein: 25,
    carbohydrates: 60,
    fat: 15,
  },
  ...overrides,
});

const mockRecipes: RecipeSummary[] = [
  createMockRecipe({
    slug: "chicken-salad",
    title: "Chicken Salad",
    description: "A healthy chicken salad with greens",
    tags: ["healthy", "quick", "lunch"],
    isFavorite: true,
    rating: 4.5,
    updatedAt: new Date("2024-01-03"),
  }),
  createMockRecipe({
    slug: "protein-shake",
    title: "Protein Shake",
    description: "Post-workout protein shake",
    tags: ["quick", "breakfast", "high-protein"],
    isFavorite: false,
    rating: 4.0,
    updatedAt: new Date("2024-01-02"),
  }),
  createMockRecipe({
    slug: "veggie-bowl",
    title: "Veggie Bowl",
    description: "Colorful vegetable buddha bowl",
    tags: ["healthy", "vegetarian", "dinner"],
    isFavorite: true,
    rating: 5.0,
    updatedAt: new Date("2024-01-01"),
  }),
  createMockRecipe({
    slug: "banana-bread",
    title: "Banana Bread",
    description: "Sweet homemade banana bread",
    tags: ["dessert", "breakfast"],
    isFavorite: false,
    rating: undefined,
    updatedAt: new Date("2024-01-04"),
  }),
];

// ============================================
// filterBySearchQuery Tests
// ============================================

describe("filterBySearchQuery", () => {
  it("returns all recipes when query is empty", () => {
    const result = filterBySearchQuery(mockRecipes, "");
    expect(result).toHaveLength(4);
  });

  it("filters by title (case insensitive)", () => {
    const result = filterBySearchQuery(mockRecipes, "chicken");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("chicken-salad");
  });

  it("filters by title with uppercase query", () => {
    const result = filterBySearchQuery(mockRecipes, "CHICKEN");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("chicken-salad");
  });

  it("filters by description", () => {
    const result = filterBySearchQuery(mockRecipes, "post-workout");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("protein-shake");
  });

  it("filters by tag", () => {
    const result = filterBySearchQuery(mockRecipes, "vegetarian");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("veggie-bowl");
  });

  it("matches partial strings", () => {
    const result = filterBySearchQuery(mockRecipes, "ban");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("banana-bread");
  });

  it("returns multiple matches", () => {
    const result = filterBySearchQuery(mockRecipes, "healthy");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.slug)).toContain("chicken-salad");
    expect(result.map((r) => r.slug)).toContain("veggie-bowl");
  });

  it("returns empty array when no matches", () => {
    const result = filterBySearchQuery(mockRecipes, "pizza");
    expect(result).toHaveLength(0);
  });
});

// ============================================
// filterByTags Tests
// ============================================

describe("filterByTags", () => {
  it("returns all recipes when tags array is empty", () => {
    const result = filterByTags(mockRecipes, []);
    expect(result).toHaveLength(4);
  });

  it("filters by single tag", () => {
    const result = filterByTags(mockRecipes, ["healthy"]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.slug)).toContain("chicken-salad");
    expect(result.map((r) => r.slug)).toContain("veggie-bowl");
  });

  it("uses AND logic for multiple tags", () => {
    const result = filterByTags(mockRecipes, ["healthy", "quick"]);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("chicken-salad");
  });

  it("returns empty when no recipes have all tags", () => {
    const result = filterByTags(mockRecipes, ["healthy", "dessert"]);
    expect(result).toHaveLength(0);
  });

  it("handles tag that exists only on one recipe", () => {
    const result = filterByTags(mockRecipes, ["high-protein"]);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("protein-shake");
  });
});

// ============================================
// filterByFavorites Tests
// ============================================

describe("filterByFavorites", () => {
  it("returns only favorited recipes", () => {
    const result = filterByFavorites(mockRecipes);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.isFavorite)).toBe(true);
  });

  it("returns empty array when no favorites", () => {
    const noFavorites = mockRecipes.map((r) => ({ ...r, isFavorite: false }));
    const result = filterByFavorites(noFavorites);
    expect(result).toHaveLength(0);
  });
});

// ============================================
// sortRecipes Tests
// ============================================

describe("sortRecipes", () => {
  it("maintains order for 'recent' sort", () => {
    const result = sortRecipes(mockRecipes, "recent");
    expect(result).toEqual(mockRecipes);
  });

  it("does not mutate original array", () => {
    const original = [...mockRecipes];
    sortRecipes(mockRecipes, "alpha");
    expect(mockRecipes).toEqual(original);
  });

  it("sorts alphabetically by title for 'alpha'", () => {
    const result = sortRecipes(mockRecipes, "alpha");
    expect(result.map((r) => r.title)).toEqual([
      "Banana Bread",
      "Chicken Salad",
      "Protein Shake",
      "Veggie Bowl",
    ]);
  });

  it("sorts by rating descending for 'rating'", () => {
    const result = sortRecipes(mockRecipes, "rating");
    // Veggie Bowl (5.0) > Chicken Salad (4.5) > Protein Shake (4.0) > Banana Bread (undefined)
    expect(result.map((r) => r.title)).toEqual([
      "Veggie Bowl",
      "Chicken Salad",
      "Protein Shake",
      "Banana Bread",
    ]);
  });

  it("puts undefined ratings last when sorting by rating", () => {
    const result = sortRecipes(mockRecipes, "rating");
    expect(result[result.length - 1].rating).toBeUndefined();
  });
});

// ============================================
// filterAndSortRecipes Tests
// ============================================

describe("filterAndSortRecipes", () => {
  it("returns all recipes with empty options", () => {
    const result = filterAndSortRecipes(mockRecipes, {});
    expect(result).toHaveLength(4);
  });

  it("combines search and tag filters", () => {
    const result = filterAndSortRecipes(mockRecipes, {
      searchQuery: "salad",
      selectedTags: ["healthy"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("chicken-salad");
  });

  it("combines favorites and sort", () => {
    const result = filterAndSortRecipes(mockRecipes, {
      favoritesOnly: true,
      sortBy: "rating",
    });
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Veggie Bowl"); // 5.0 rating
    expect(result[1].title).toBe("Chicken Salad"); // 4.5 rating
  });

  it("applies all filters together", () => {
    const result = filterAndSortRecipes(mockRecipes, {
      searchQuery: "healthy",
      selectedTags: ["lunch"],
      favoritesOnly: true,
      sortBy: "alpha",
    });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("chicken-salad");
  });

  it("returns empty array when filters exclude all recipes", () => {
    const result = filterAndSortRecipes(mockRecipes, {
      searchQuery: "pizza",
      selectedTags: ["nonexistent"],
      favoritesOnly: true,
    });
    expect(result).toHaveLength(0);
  });
});

// ============================================
// countActiveFilters Tests
// ============================================

describe("countActiveFilters", () => {
  it("returns 0 for empty options", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("counts search query as 1", () => {
    expect(countActiveFilters({ searchQuery: "test" })).toBe(1);
  });

  it("does not count empty search query", () => {
    expect(countActiveFilters({ searchQuery: "" })).toBe(0);
  });

  it("counts each selected tag", () => {
    expect(countActiveFilters({ selectedTags: ["tag1", "tag2", "tag3"] })).toBe(3);
  });

  it("counts favorites as 1", () => {
    expect(countActiveFilters({ favoritesOnly: true })).toBe(1);
  });

  it("does not count favoritesOnly when false", () => {
    expect(countActiveFilters({ favoritesOnly: false })).toBe(0);
  });

  it("counts non-default sort as 1", () => {
    expect(countActiveFilters({ sortBy: "alpha" })).toBe(1);
    expect(countActiveFilters({ sortBy: "rating" })).toBe(1);
  });

  it("does not count 'recent' sort (default)", () => {
    expect(countActiveFilters({ sortBy: "recent" })).toBe(0);
  });

  it("sums all active filters correctly", () => {
    const result = countActiveFilters({
      searchQuery: "test",
      selectedTags: ["tag1", "tag2"],
      favoritesOnly: true,
      sortBy: "alpha",
    });
    expect(result).toBe(5); // 1 + 2 + 1 + 1
  });
});
