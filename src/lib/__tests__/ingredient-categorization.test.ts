import { describe, it, expect } from "vitest";
import {
  categorizeIngredientByKeyword,
  categorizeIngredients,
  getCategoryOrDefault,
} from "../ingredient-categorization";

describe("Ingredient Categorization", () => {
  describe("categorizeIngredientByKeyword", () => {
    describe("produce category", () => {
      it("categorizes fruits", () => {
        expect(categorizeIngredientByKeyword("apple")).toBe("produce");
        expect(categorizeIngredientByKeyword("banana")).toBe("produce");
        expect(categorizeIngredientByKeyword("strawberries")).toBe("produce");
        expect(categorizeIngredientByKeyword("mango")).toBe("produce");
      });

      it("categorizes vegetables", () => {
        expect(categorizeIngredientByKeyword("tomato")).toBe("produce");
        expect(categorizeIngredientByKeyword("carrot")).toBe("produce");
        expect(categorizeIngredientByKeyword("spinach")).toBe("produce");
        expect(categorizeIngredientByKeyword("broccoli")).toBe("produce");
        expect(categorizeIngredientByKeyword("onion")).toBe("produce");
        expect(categorizeIngredientByKeyword("garlic")).toBe("produce");
      });

      it("categorizes fresh herbs", () => {
        expect(categorizeIngredientByKeyword("basil")).toBe("produce");
        expect(categorizeIngredientByKeyword("parsley")).toBe("produce");
        expect(categorizeIngredientByKeyword("cilantro")).toBe("produce");
        expect(categorizeIngredientByKeyword("mint")).toBe("produce");
      });
    });

    describe("dairy category", () => {
      it("categorizes milk products", () => {
        expect(categorizeIngredientByKeyword("milk")).toBe("dairy");
        expect(categorizeIngredientByKeyword("cream")).toBe("dairy");
        expect(categorizeIngredientByKeyword("butter")).toBe("dairy");
        expect(categorizeIngredientByKeyword("yogurt")).toBe("dairy");
      });

      it("categorizes cheese", () => {
        expect(categorizeIngredientByKeyword("cheese")).toBe("dairy");
        expect(categorizeIngredientByKeyword("cheddar")).toBe("dairy");
        expect(categorizeIngredientByKeyword("mozzarella")).toBe("dairy");
        expect(categorizeIngredientByKeyword("parmesan")).toBe("dairy");
      });

      it("categorizes eggs", () => {
        expect(categorizeIngredientByKeyword("egg")).toBe("dairy");
        expect(categorizeIngredientByKeyword("eggs")).toBe("dairy");
      });
    });

    describe("meat category", () => {
      it("categorizes poultry", () => {
        expect(categorizeIngredientByKeyword("chicken")).toBe("meat");
        expect(categorizeIngredientByKeyword("turkey")).toBe("meat");
        expect(categorizeIngredientByKeyword("duck")).toBe("meat");
      });

      it("categorizes beef", () => {
        expect(categorizeIngredientByKeyword("beef")).toBe("meat");
        expect(categorizeIngredientByKeyword("steak")).toBe("meat");
        expect(categorizeIngredientByKeyword("ground beef")).toBe("meat");
      });

      it("categorizes pork", () => {
        expect(categorizeIngredientByKeyword("pork")).toBe("meat");
        expect(categorizeIngredientByKeyword("bacon")).toBe("meat");
        expect(categorizeIngredientByKeyword("ham")).toBe("meat");
        expect(categorizeIngredientByKeyword("sausage")).toBe("meat");
      });

      it("categorizes seafood", () => {
        expect(categorizeIngredientByKeyword("salmon")).toBe("meat");
        expect(categorizeIngredientByKeyword("tuna")).toBe("meat");
        expect(categorizeIngredientByKeyword("shrimp")).toBe("meat");
        expect(categorizeIngredientByKeyword("cod")).toBe("meat");
      });
    });

    describe("bakery category", () => {
      it("categorizes bread products", () => {
        expect(categorizeIngredientByKeyword("bread")).toBe("bakery");
        expect(categorizeIngredientByKeyword("bagel")).toBe("bakery");
        expect(categorizeIngredientByKeyword("baguette")).toBe("bakery");
        expect(categorizeIngredientByKeyword("croissant")).toBe("bakery");
      });

      it("categorizes pastries", () => {
        expect(categorizeIngredientByKeyword("muffin")).toBe("bakery");
        expect(categorizeIngredientByKeyword("cookie")).toBe("bakery");
        expect(categorizeIngredientByKeyword("cake")).toBe("bakery");
      });

      it("categorizes tortillas and wraps", () => {
        expect(categorizeIngredientByKeyword("tortilla")).toBe("bakery");
        expect(categorizeIngredientByKeyword("wrap")).toBe("bakery");
        expect(categorizeIngredientByKeyword("pita")).toBe("bakery");
      });
    });

    describe("pantry category", () => {
      it("categorizes grains and pasta", () => {
        expect(categorizeIngredientByKeyword("rice")).toBe("pantry");
        expect(categorizeIngredientByKeyword("pasta")).toBe("pantry");
        expect(categorizeIngredientByKeyword("spaghetti")).toBe("pantry");
        expect(categorizeIngredientByKeyword("quinoa")).toBe("pantry");
        expect(categorizeIngredientByKeyword("oats")).toBe("pantry");
      });

      it("categorizes oils and vinegars", () => {
        expect(categorizeIngredientByKeyword("olive oil")).toBe("pantry");
        expect(categorizeIngredientByKeyword("vinegar")).toBe("pantry");
        expect(categorizeIngredientByKeyword("coconut oil")).toBe("pantry");
      });

      it("categorizes spices", () => {
        expect(categorizeIngredientByKeyword("salt")).toBe("pantry");
        expect(categorizeIngredientByKeyword("pepper")).toBe("pantry");
        expect(categorizeIngredientByKeyword("paprika")).toBe("pantry");
        expect(categorizeIngredientByKeyword("cinnamon")).toBe("pantry");
      });

      it("categorizes baking supplies", () => {
        expect(categorizeIngredientByKeyword("flour")).toBe("pantry");
        expect(categorizeIngredientByKeyword("sugar")).toBe("pantry");
        expect(categorizeIngredientByKeyword("baking soda")).toBe("pantry");
        expect(categorizeIngredientByKeyword("yeast")).toBe("pantry");
      });

      it("categorizes nuts and seeds", () => {
        expect(categorizeIngredientByKeyword("almonds")).toBe("pantry");
        expect(categorizeIngredientByKeyword("walnuts")).toBe("pantry");
        expect(categorizeIngredientByKeyword("chia seeds")).toBe("pantry");
      });

      it("categorizes legumes", () => {
        expect(categorizeIngredientByKeyword("beans")).toBe("pantry");
        expect(categorizeIngredientByKeyword("lentils")).toBe("pantry");
        expect(categorizeIngredientByKeyword("chickpeas")).toBe("pantry");
      });

      it("categorizes condiments and sauces", () => {
        expect(categorizeIngredientByKeyword("soy sauce")).toBe("pantry");
        expect(categorizeIngredientByKeyword("ketchup")).toBe("pantry");
        expect(categorizeIngredientByKeyword("mustard")).toBe("pantry");
      });
    });

    describe("frozen category", () => {
      it("categorizes frozen items", () => {
        expect(categorizeIngredientByKeyword("frozen")).toBe("frozen");
        expect(categorizeIngredientByKeyword("ice cream")).toBe("frozen");
        expect(categorizeIngredientByKeyword("frozen vegetables")).toBe(
          "frozen"
        );
        expect(categorizeIngredientByKeyword("frozen pizza")).toBe("frozen");
      });
    });

    describe("beverages category", () => {
      it("categorizes drinks", () => {
        expect(categorizeIngredientByKeyword("water")).toBe("beverages");
        expect(categorizeIngredientByKeyword("juice")).toBe("beverages");
        expect(categorizeIngredientByKeyword("coffee")).toBe("beverages");
        expect(categorizeIngredientByKeyword("tea")).toBe("beverages");
        expect(categorizeIngredientByKeyword("wine")).toBe("beverages");
        expect(categorizeIngredientByKeyword("beer")).toBe("beverages");
      });
    });

    describe("partial matching", () => {
      it("matches ingredients containing keywords", () => {
        expect(categorizeIngredientByKeyword("fresh tomatoes")).toBe("produce");
        expect(categorizeIngredientByKeyword("organic chicken breast")).toBe(
          "meat"
        );
        expect(categorizeIngredientByKeyword("low-fat milk")).toBe("dairy");
      });

      it("matches keywords containing ingredient name", () => {
        expect(categorizeIngredientByKeyword("egg")).toBe("dairy");
      });
    });

    describe("case insensitivity", () => {
      it("handles uppercase", () => {
        expect(categorizeIngredientByKeyword("CHICKEN")).toBe("meat");
        expect(categorizeIngredientByKeyword("TOMATO")).toBe("produce");
      });

      it("handles mixed case", () => {
        expect(categorizeIngredientByKeyword("Chicken Breast")).toBe("meat");
        expect(categorizeIngredientByKeyword("Cherry Tomatoes")).toBe(
          "produce"
        );
      });
    });

    describe("unknown ingredients", () => {
      it("returns null for unrecognized ingredients", () => {
        expect(
          categorizeIngredientByKeyword("xyzabc123nonsense")
        ).toBeNull();
        expect(categorizeIngredientByKeyword("exotic ingredient")).toBeNull();
      });
    });
  });

  describe("categorizeIngredients", () => {
    it("categorizes multiple ingredients", () => {
      const ingredients = ["chicken", "tomato", "milk", "bread"];
      const result = categorizeIngredients(ingredients);

      expect(result.get("chicken")).toBe("meat");
      expect(result.get("tomato")).toBe("produce");
      expect(result.get("milk")).toBe("dairy");
      expect(result.get("bread")).toBe("bakery");
    });

    it("returns null for unknown ingredients", () => {
      const ingredients = ["chicken", "unknown123"];
      const result = categorizeIngredients(ingredients);

      expect(result.get("chicken")).toBe("meat");
      expect(result.get("unknown123")).toBeNull();
    });

    it("handles empty array", () => {
      const result = categorizeIngredients([]);
      expect(result.size).toBe(0);
    });
  });

  describe("getCategoryOrDefault", () => {
    it("returns category for known ingredients", () => {
      expect(getCategoryOrDefault("chicken")).toBe("meat");
      expect(getCategoryOrDefault("tomato")).toBe("produce");
      expect(getCategoryOrDefault("milk")).toBe("dairy");
    });

    it('returns "other" for unknown ingredients', () => {
      expect(getCategoryOrDefault("unknown123")).toBe("other");
      expect(getCategoryOrDefault("strange ingredient xyz")).toBe("other");
    });
  });
});
