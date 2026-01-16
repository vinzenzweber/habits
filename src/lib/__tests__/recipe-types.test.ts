import { describe, it, expect } from "vitest";
import {
  generateSlug,
  getPrimaryImage,
  toRecipeSummary,
  getTotalTimeMinutes,
  getAllIngredients,
  getIngredientCount,
  isValidNutritionInfo,
  isValidIngredient,
  isValidIngredientGroup,
  isValidRecipeStep,
  isValidRecipeImage,
  isValidRecipeJson,
  type Recipe,
  type RecipeJson,
  type RecipeImage,
  type IngredientGroup,
} from "../recipe-types";

describe("Recipe Types", () => {
  describe("generateSlug", () => {
    it("converts title to lowercase", () => {
      expect(generateSlug("Hello World")).toBe("hello-world");
    });

    it("replaces spaces with hyphens", () => {
      expect(generateSlug("protein pancakes")).toBe("protein-pancakes");
    });

    it("removes diacritics (German umlauts)", () => {
      expect(generateSlug("Käsekuchen")).toBe("kasekuchen");
      expect(generateSlug("Müsli")).toBe("musli");
      expect(generateSlug("Brötchen")).toBe("brotchen");
    });

    it("removes special characters", () => {
      expect(generateSlug("Recipe #1!")).toBe("recipe-1");
      expect(generateSlug("Pasta & Cheese")).toBe("pasta-cheese");
    });

    it("trims leading and trailing hyphens", () => {
      expect(generateSlug("  spaces around  ")).toBe("spaces-around");
      expect(generateSlug("---leading")).toBe("leading");
      expect(generateSlug("trailing---")).toBe("trailing");
    });

    it("truncates to 200 characters", () => {
      const longTitle = "a".repeat(250);
      expect(generateSlug(longTitle).length).toBe(200);
    });

    it("handles empty string", () => {
      expect(generateSlug("")).toBe("");
    });

    it("handles numbers in title", () => {
      expect(generateSlug("Recipe 123")).toBe("recipe-123");
    });
  });

  describe("getPrimaryImage", () => {
    it("returns undefined for empty array", () => {
      expect(getPrimaryImage([])).toBeUndefined();
    });

    it("returns first image if none marked as primary", () => {
      const images: RecipeImage[] = [
        { url: "/img/1.jpg" },
        { url: "/img/2.jpg" },
      ];
      expect(getPrimaryImage(images)).toEqual({ url: "/img/1.jpg" });
    });

    it("returns image marked as primary", () => {
      const images: RecipeImage[] = [
        { url: "/img/1.jpg" },
        { url: "/img/2.jpg", isPrimary: true },
        { url: "/img/3.jpg" },
      ];
      expect(getPrimaryImage(images)).toEqual({
        url: "/img/2.jpg",
        isPrimary: true,
      });
    });

    it("returns first primary if multiple marked", () => {
      const images: RecipeImage[] = [
        { url: "/img/1.jpg", isPrimary: true },
        { url: "/img/2.jpg", isPrimary: true },
      ];
      expect(getPrimaryImage(images)).toEqual({
        url: "/img/1.jpg",
        isPrimary: true,
      });
    });
  });

  describe("getTotalTimeMinutes", () => {
    const baseRecipe: RecipeJson = {
      slug: "test",
      title: "Test",
      description: "Test",
      tags: [],
      servings: 1,
      nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
      ingredientGroups: [],
      steps: [],
      images: [{ url: "/img.jpg" }],
      locale: "en-US",
    };

    it("returns undefined when both times are undefined", () => {
      expect(getTotalTimeMinutes(baseRecipe)).toBeUndefined();
    });

    it("returns prep time when only prep is defined", () => {
      expect(
        getTotalTimeMinutes({ ...baseRecipe, prepTimeMinutes: 10 })
      ).toBe(10);
    });

    it("returns cook time when only cook is defined", () => {
      expect(
        getTotalTimeMinutes({ ...baseRecipe, cookTimeMinutes: 30 })
      ).toBe(30);
    });

    it("returns sum of both times", () => {
      expect(
        getTotalTimeMinutes({
          ...baseRecipe,
          prepTimeMinutes: 15,
          cookTimeMinutes: 45,
        })
      ).toBe(60);
    });
  });

  describe("getAllIngredients", () => {
    it("returns empty array for no groups", () => {
      const recipe: RecipeJson = {
        slug: "test",
        title: "Test",
        description: "Test",
        tags: [],
        servings: 1,
        nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
        ingredientGroups: [],
        steps: [],
        images: [{ url: "/img.jpg" }],
        locale: "en-US",
      };
      expect(getAllIngredients(recipe)).toEqual([]);
    });

    it("flattens ingredients from all groups", () => {
      const recipe: RecipeJson = {
        slug: "test",
        title: "Test",
        description: "Test",
        tags: [],
        servings: 1,
        nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
        ingredientGroups: [
          {
            name: "Dairy",
            ingredients: [
              { name: "Milk", quantity: 200, unit: "ml" },
              { name: "Cheese", quantity: 50, unit: "g" },
            ],
          },
          {
            name: "Protein",
            ingredients: [{ name: "Whey", quantity: 30, unit: "g" }],
          },
        ],
        steps: [],
        images: [{ url: "/img.jpg" }],
        locale: "en-US",
      };
      const ingredients = getAllIngredients(recipe);
      expect(ingredients).toHaveLength(3);
      expect(ingredients[0].name).toBe("Milk");
      expect(ingredients[2].name).toBe("Whey");
    });
  });

  describe("getIngredientCount", () => {
    it("returns 0 for no ingredients", () => {
      const recipe: RecipeJson = {
        slug: "test",
        title: "Test",
        description: "Test",
        tags: [],
        servings: 1,
        nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
        ingredientGroups: [],
        steps: [],
        images: [{ url: "/img.jpg" }],
        locale: "en-US",
      };
      expect(getIngredientCount(recipe)).toBe(0);
    });

    it("counts all ingredients across groups", () => {
      const recipe: RecipeJson = {
        slug: "test",
        title: "Test",
        description: "Test",
        tags: [],
        servings: 1,
        nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
        ingredientGroups: [
          {
            name: "Group 1",
            ingredients: [
              { name: "A", quantity: 1, unit: "g" },
              { name: "B", quantity: 1, unit: "g" },
            ],
          },
          {
            name: "Group 2",
            ingredients: [{ name: "C", quantity: 1, unit: "g" }],
          },
        ],
        steps: [],
        images: [{ url: "/img.jpg" }],
        locale: "en-US",
      };
      expect(getIngredientCount(recipe)).toBe(3);
    });
  });

  describe("toRecipeSummary", () => {
    it("extracts summary fields from full recipe", () => {
      const recipe: Recipe = {
        id: 1,
        userId: 1,
        slug: "test-recipe",
        version: 1,
        title: "Test Recipe",
        description: "A test recipe description",
        locale: "en-US",
        tags: ["breakfast", "high-protein"],
        recipeJson: {
          slug: "test-recipe",
          title: "Test Recipe",
          description: "JSON description",
          tags: ["breakfast", "high-protein"],
          servings: 2,
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          nutrition: { calories: 300, protein: 25, carbohydrates: 30, fat: 10 },
          ingredientGroups: [
            {
              name: "Main",
              ingredients: [{ name: "Oats", quantity: 100, unit: "g" }],
            },
          ],
          steps: [{ number: 1, instruction: "Mix ingredients" }],
          images: [
            { url: "/img1.jpg" },
            { url: "/img2.jpg", isPrimary: true },
          ],
          locale: "en-US",
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = toRecipeSummary(recipe);

      expect(summary.slug).toBe("test-recipe");
      expect(summary.title).toBe("Test Recipe");
      expect(summary.description).toBe("A test recipe description");
      expect(summary.tags).toEqual(["breakfast", "high-protein"]);
      expect(summary.servings).toBe(2);
      expect(summary.prepTimeMinutes).toBe(10);
      expect(summary.cookTimeMinutes).toBe(20);
      expect(summary.primaryImage?.url).toBe("/img2.jpg");
      expect(summary.nutrition.calories).toBe(300);
    });

    it("uses recipeJson description when recipe description is null", () => {
      const recipe: Recipe = {
        id: 1,
        userId: 1,
        slug: "test",
        version: 1,
        title: "Test",
        description: null,
        locale: "en-US",
        tags: [],
        recipeJson: {
          slug: "test",
          title: "Test",
          description: "Fallback description",
          tags: [],
          servings: 1,
          nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
          ingredientGroups: [],
          steps: [],
          images: [{ url: "/img.jpg" }],
          locale: "en-US",
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = toRecipeSummary(recipe);
      expect(summary.description).toBe("Fallback description");
    });
  });

  describe("Type Guards", () => {
    describe("isValidNutritionInfo", () => {
      it("returns true for valid nutrition info", () => {
        expect(
          isValidNutritionInfo({
            calories: 100,
            protein: 10,
            carbohydrates: 20,
            fat: 5,
          })
        ).toBe(true);
      });

      it("returns true with optional fiber", () => {
        expect(
          isValidNutritionInfo({
            calories: 100,
            protein: 10,
            carbohydrates: 20,
            fat: 5,
            fiber: 3,
          })
        ).toBe(true);
      });

      it("returns false for missing required fields", () => {
        expect(isValidNutritionInfo({ calories: 100 })).toBe(false);
        expect(isValidNutritionInfo({ protein: 10 })).toBe(false);
      });

      it("returns false for non-object", () => {
        expect(isValidNutritionInfo(null)).toBe(false);
        expect(isValidNutritionInfo("string")).toBe(false);
        expect(isValidNutritionInfo(123)).toBe(false);
      });

      it("returns false for wrong types", () => {
        expect(
          isValidNutritionInfo({
            calories: "100",
            protein: 10,
            carbohydrates: 20,
            fat: 5,
          })
        ).toBe(false);
      });
    });

    describe("isValidIngredient", () => {
      it("returns true for valid ingredient", () => {
        expect(
          isValidIngredient({ name: "Oats", quantity: 100, unit: "g" })
        ).toBe(true);
      });

      it("returns false for missing fields", () => {
        expect(isValidIngredient({ name: "Oats" })).toBe(false);
        expect(isValidIngredient({ name: "Oats", quantity: 100 })).toBe(false);
      });

      it("returns false for wrong types", () => {
        expect(
          isValidIngredient({ name: "Oats", quantity: "100", unit: "g" })
        ).toBe(false);
      });
    });

    describe("isValidIngredientGroup", () => {
      it("returns true for valid group", () => {
        const group: IngredientGroup = {
          name: "Dairy",
          ingredients: [{ name: "Milk", quantity: 200, unit: "ml" }],
        };
        expect(isValidIngredientGroup(group)).toBe(true);
      });

      it("returns true for empty ingredients array", () => {
        expect(
          isValidIngredientGroup({ name: "Empty", ingredients: [] })
        ).toBe(true);
      });

      it("returns false for invalid ingredient in group", () => {
        expect(
          isValidIngredientGroup({
            name: "Invalid",
            ingredients: [{ name: "Bad", quantity: "not a number" }],
          })
        ).toBe(false);
      });
    });

    describe("isValidRecipeStep", () => {
      it("returns true for valid step", () => {
        expect(
          isValidRecipeStep({ number: 1, instruction: "Mix well" })
        ).toBe(true);
      });

      it("returns false for missing instruction", () => {
        expect(isValidRecipeStep({ number: 1 })).toBe(false);
      });

      it("returns false for wrong types", () => {
        expect(
          isValidRecipeStep({ number: "1", instruction: "Mix" })
        ).toBe(false);
      });
    });

    describe("isValidRecipeImage", () => {
      it("returns true for valid image", () => {
        expect(isValidRecipeImage({ url: "/img.jpg" })).toBe(true);
      });

      it("returns true with optional fields", () => {
        expect(
          isValidRecipeImage({
            url: "/img.jpg",
            caption: "Main dish",
            isPrimary: true,
          })
        ).toBe(true);
      });

      it("returns false for missing url", () => {
        expect(isValidRecipeImage({ caption: "No URL" })).toBe(false);
      });

      it("returns false for wrong types", () => {
        expect(isValidRecipeImage({ url: 123 })).toBe(false);
        expect(
          isValidRecipeImage({ url: "/img.jpg", isPrimary: "true" })
        ).toBe(false);
      });
    });

    describe("isValidRecipeJson", () => {
      const validRecipe: RecipeJson = {
        slug: "test-recipe",
        title: "Test Recipe",
        description: "A test",
        tags: ["breakfast"],
        servings: 2,
        nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
        ingredientGroups: [
          {
            name: "Main",
            ingredients: [{ name: "Oats", quantity: 100, unit: "g" }],
          },
        ],
        steps: [{ number: 1, instruction: "Mix" }],
        images: [{ url: "/img.jpg" }],
        locale: "en-US",
      };

      it("returns true for valid recipe", () => {
        expect(isValidRecipeJson(validRecipe)).toBe(true);
      });

      it("returns true with optional fields", () => {
        expect(
          isValidRecipeJson({
            ...validRecipe,
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
          })
        ).toBe(true);
      });

      it("returns false for missing required fields", () => {
        const { slug: _slug, ...noSlug } = validRecipe;
        expect(isValidRecipeJson(noSlug)).toBe(false);
      });

      it("returns false for empty images array", () => {
        expect(isValidRecipeJson({ ...validRecipe, images: [] })).toBe(false);
      });

      it("returns false for more than 10 images", () => {
        const tooManyImages = Array(11)
          .fill(null)
          .map((_, i) => ({ url: `/img${i}.jpg` }));
        expect(
          isValidRecipeJson({ ...validRecipe, images: tooManyImages })
        ).toBe(false);
      });

      it("returns false for invalid nested objects", () => {
        expect(
          isValidRecipeJson({
            ...validRecipe,
            nutrition: { calories: "not a number" },
          })
        ).toBe(false);
      });

      it("returns false for non-string tags", () => {
        expect(
          isValidRecipeJson({ ...validRecipe, tags: [1, 2, 3] })
        ).toBe(false);
      });
    });
  });
});
