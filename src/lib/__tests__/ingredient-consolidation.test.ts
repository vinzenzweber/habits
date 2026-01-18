import { describe, it, expect } from "vitest";
import {
  normalizeIngredientName,
  normalizeUnit,
  areUnitsCompatible,
  convertUnits,
  consolidateIngredients,
  RawIngredient,
} from "../ingredient-consolidation";

describe("Ingredient Consolidation", () => {
  describe("normalizeIngredientName", () => {
    it("converts to lowercase", () => {
      expect(normalizeIngredientName("CHICKEN")).toBe("chicken");
      expect(normalizeIngredientName("Tomato")).toBe("tomato");
    });

    it("trims whitespace", () => {
      expect(normalizeIngredientName("  chicken  ")).toBe("chicken");
      expect(normalizeIngredientName("\ttomato\n")).toBe("tomato");
    });

    it("removes common modifiers", () => {
      expect(normalizeIngredientName("fresh basil")).toBe("basil");
      expect(normalizeIngredientName("dried oregano")).toBe("oregano");
      expect(normalizeIngredientName("frozen peas")).toBe("peas");
      expect(normalizeIngredientName("canned tomatoes")).toBe("tomatoes");
      expect(normalizeIngredientName("chopped onion")).toBe("onion");
      expect(normalizeIngredientName("diced carrots")).toBe("carrots");
    });

    it("removes size modifiers", () => {
      expect(normalizeIngredientName("large egg")).toBe("egg");
      expect(normalizeIngredientName("medium onion")).toBe("onion");
      expect(normalizeIngredientName("small potato")).toBe("potato");
    });

    it("removes cooking modifiers", () => {
      expect(normalizeIngredientName("raw chicken")).toBe("chicken");
      expect(normalizeIngredientName("cooked rice")).toBe("rice");
      expect(normalizeIngredientName("roasted garlic")).toBe("garlic");
    });

    it("cleans up multiple spaces", () => {
      expect(normalizeIngredientName("fresh  minced   garlic")).toBe("garlic");
    });
  });

  describe("normalizeUnit", () => {
    it("converts to lowercase", () => {
      expect(normalizeUnit("ML")).toBe("ml");
      expect(normalizeUnit("Cup")).toBe("cup");
    });

    it("trims whitespace", () => {
      expect(normalizeUnit(" g ")).toBe("g");
    });
  });

  describe("areUnitsCompatible", () => {
    it("returns true for same units", () => {
      expect(areUnitsCompatible("ml", "ml")).toBe(true);
      expect(areUnitsCompatible("g", "g")).toBe(true);
      expect(areUnitsCompatible("cup", "cup")).toBe(true);
    });

    it("returns true for compatible volume units", () => {
      expect(areUnitsCompatible("ml", "l")).toBe(true);
      expect(areUnitsCompatible("cup", "ml")).toBe(true);
      expect(areUnitsCompatible("tsp", "tbsp")).toBe(true);
      expect(areUnitsCompatible("fl oz", "cup")).toBe(true);
    });

    it("returns true for compatible weight units", () => {
      expect(areUnitsCompatible("g", "kg")).toBe(true);
      expect(areUnitsCompatible("oz", "lb")).toBe(true);
      expect(areUnitsCompatible("g", "oz")).toBe(true);
    });

    it("returns true for compatible count units", () => {
      expect(areUnitsCompatible("", "pcs")).toBe(true);
      expect(areUnitsCompatible("piece", "pieces")).toBe(true);
      expect(areUnitsCompatible("clove", "cloves")).toBe(true);
    });

    it("returns false for incompatible units", () => {
      expect(areUnitsCompatible("ml", "g")).toBe(false);
      expect(areUnitsCompatible("cup", "oz")).toBe(false);
      expect(areUnitsCompatible("kg", "l")).toBe(false);
    });
  });

  describe("convertUnits", () => {
    it("returns same quantity for same unit", () => {
      expect(convertUnits(100, "ml", "ml")).toBe(100);
      expect(convertUnits(500, "g", "g")).toBe(500);
    });

    it("converts between volume units", () => {
      // 1 liter = 1000 ml
      expect(convertUnits(1, "l", "ml")).toBeCloseTo(1000);
      expect(convertUnits(1000, "ml", "l")).toBeCloseTo(1);

      // 1 cup = 236.588 ml
      expect(convertUnits(1, "cup", "ml")).toBeCloseTo(236.588, 1);

      // 1 tbsp = 14.787 ml
      expect(convertUnits(1, "tbsp", "ml")).toBeCloseTo(14.787, 1);
    });

    it("converts between weight units", () => {
      // 1 kg = 1000 g
      expect(convertUnits(1, "kg", "g")).toBeCloseTo(1000);
      expect(convertUnits(1000, "g", "kg")).toBeCloseTo(1);

      // 1 lb = 453.592 g
      expect(convertUnits(1, "lb", "g")).toBeCloseTo(453.592, 1);

      // 1 oz = 28.3495 g
      expect(convertUnits(1, "oz", "g")).toBeCloseTo(28.3495, 1);
    });

    it("handles count unit conversion", () => {
      expect(convertUnits(5, "pcs", "pieces")).toBe(5);
      expect(convertUnits(3, "clove", "cloves")).toBe(3);
    });

    it("returns null for incompatible units", () => {
      expect(convertUnits(100, "ml", "g")).toBeNull();
      expect(convertUnits(100, "cup", "oz")).toBeNull();
    });
  });

  describe("consolidateIngredients", () => {
    it("groups identical ingredients", () => {
      const ingredients: RawIngredient[] = [
        { name: "chicken", quantity: 200, unit: "g", recipeId: 1 },
        { name: "chicken", quantity: 300, unit: "g", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("chicken");
      expect(result[0].quantity).toBe(500);
      expect(result[0].unit).toBe("g");
      expect(result[0].sourceRecipeIds).toEqual([1, 2]);
    });

    it("groups ingredients with different casing", () => {
      const ingredients: RawIngredient[] = [
        { name: "Chicken", quantity: 200, unit: "g", recipeId: 1 },
        { name: "CHICKEN", quantity: 100, unit: "g", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Chicken"); // Preserves first name's casing
      expect(result[0].quantity).toBe(300);
    });

    it("groups ingredients with normalized names", () => {
      const ingredients: RawIngredient[] = [
        { name: "fresh basil", quantity: 10, unit: "g", recipeId: 1 },
        { name: "dried basil", quantity: 5, unit: "g", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("fresh basil"); // Preserves first name
      expect(result[0].quantity).toBe(15);
    });

    it("converts and sums compatible units", () => {
      const ingredients: RawIngredient[] = [
        { name: "milk", quantity: 500, unit: "ml", recipeId: 1 },
        { name: "milk", quantity: 1, unit: "l", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("milk");
      expect(result[0].quantity).toBe(1500);
      expect(result[0].unit).toBe("ml");
    });

    it("keeps separate entries for incompatible units", () => {
      const ingredients: RawIngredient[] = [
        { name: "olive oil", quantity: 100, unit: "ml", recipeId: 1 },
        { name: "olive oil", quantity: 50, unit: "g", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.unit).sort()).toEqual(["g", "ml"]);
    });

    it("applies servings multiplier", () => {
      const ingredients: RawIngredient[] = [
        { name: "chicken", quantity: 200, unit: "g", recipeId: 1 },
      ];

      const result = consolidateIngredients(ingredients, 2);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(400);
    });

    it("applies servings multiplier before consolidation", () => {
      const ingredients: RawIngredient[] = [
        { name: "flour", quantity: 100, unit: "g", recipeId: 1 },
        { name: "flour", quantity: 200, unit: "g", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients, 1.5);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(450); // (100 + 200) * 1.5
    });

    it("handles empty input", () => {
      const result = consolidateIngredients([]);
      expect(result).toHaveLength(0);
    });

    it("handles single ingredient", () => {
      const ingredients: RawIngredient[] = [
        { name: "salt", quantity: 5, unit: "g", recipeId: 1 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("salt");
      expect(result[0].quantity).toBe(5);
      expect(result[0].sourceRecipeIds).toEqual([1]);
    });

    it("rounds quantities to reasonable precision", () => {
      const ingredients: RawIngredient[] = [
        { name: "sugar", quantity: 100, unit: "g", recipeId: 1 },
        { name: "sugar", quantity: 33.333, unit: "g", recipeId: 2 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      // Should be rounded to 2 decimal places
      expect(result[0].quantity).toBe(133.33);
    });

    it("tracks all source recipe IDs", () => {
      const ingredients: RawIngredient[] = [
        { name: "garlic", quantity: 2, unit: "cloves", recipeId: 1 },
        { name: "garlic", quantity: 3, unit: "cloves", recipeId: 2 },
        { name: "garlic", quantity: 1, unit: "cloves", recipeId: 3 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].sourceRecipeIds).toEqual([1, 2, 3]);
    });

    it("deduplicates recipe IDs when same recipe contributes twice", () => {
      const ingredients: RawIngredient[] = [
        { name: "onion", quantity: 1, unit: "pcs", recipeId: 1 },
        { name: "onion", quantity: 2, unit: "pcs", recipeId: 1 }, // Same recipe
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(3);
      expect(result[0].sourceRecipeIds).toEqual([1]); // Deduplicated
    });

    it("initializes category to null", () => {
      const ingredients: RawIngredient[] = [
        { name: "tomato", quantity: 2, unit: "pcs", recipeId: 1 },
      ];

      const result = consolidateIngredients(ingredients);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBeNull();
    });
  });
});
