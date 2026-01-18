import { describe, it, expect } from "vitest";
import {
  REGIONAL_INGREDIENT_EXAMPLES,
  getRegionalIngredientContext,
} from "../regional-ingredients";

describe("Regional Ingredients", () => {
  describe("REGIONAL_INGREDIENT_EXAMPLES", () => {
    it("contains examples for Austria", () => {
      const austria = REGIONAL_INGREDIENT_EXAMPLES["Austria"];
      expect(austria).toBeDefined();
      expect(austria.cream).toBe("Schlagobers");
      expect(austria.tomato).toBe("Paradeiser");
      expect(austria.potato).toBe("Erdäpfel");
      expect(austria.cottage_cheese).toBe("Topfen");
    });

    it("contains examples for Germany", () => {
      const germany = REGIONAL_INGREDIENT_EXAMPLES["Germany"];
      expect(germany).toBeDefined();
      expect(germany.cream).toBe("Sahne");
      expect(germany.tomato).toBe("Tomate");
      expect(germany.potato).toBe("Kartoffel");
      expect(germany.cottage_cheese).toBe("Quark");
    });

    it("contains examples for Switzerland", () => {
      const switzerland = REGIONAL_INGREDIENT_EXAMPLES["Switzerland"];
      expect(switzerland).toBeDefined();
      expect(switzerland.cream).toBe("Rahm");
      expect(switzerland.cottage_cheese).toBe("Quark");
    });

    it("contains examples for United Kingdom", () => {
      const uk = REGIONAL_INGREDIENT_EXAMPLES["United Kingdom"];
      expect(uk).toBeDefined();
      expect(uk.cilantro).toBe("coriander");
      expect(uk.eggplant).toBe("aubergine");
      expect(uk.zucchini).toBe("courgette");
      expect(uk.arugula).toBe("rocket");
    });

    it("contains examples for United States", () => {
      const us = REGIONAL_INGREDIENT_EXAMPLES["United States"];
      expect(us).toBeDefined();
      expect(us.coriander).toBe("cilantro");
      expect(us.aubergine).toBe("eggplant");
      expect(us.courgette).toBe("zucchini");
    });

    it("distinguishes between Austrian and German terms", () => {
      const austria = REGIONAL_INGREDIENT_EXAMPLES["Austria"];
      const germany = REGIONAL_INGREDIENT_EXAMPLES["Germany"];

      // These should be different
      expect(austria.cream).not.toBe(germany.cream);
      expect(austria.tomato).not.toBe(germany.tomato);
      expect(austria.potato).not.toBe(germany.potato);
      expect(austria.cottage_cheese).not.toBe(germany.cottage_cheese);
      expect(austria.apricot).not.toBe(germany.apricot);
    });

    it("has non-empty values for all entries", () => {
      Object.values(REGIONAL_INGREDIENT_EXAMPLES).forEach((ingredients) => {
        Object.values(ingredients).forEach((value) => {
          expect(value.length).toBeGreaterThan(0);
          // Allow same value if it's a common term (like "Paprika" in German regions)
          // Just ensure it's a valid string
          expect(typeof value).toBe("string");
        });
      });
    });
  });

  describe("getRegionalIngredientContext", () => {
    it("returns Austria-specific context for Austria", () => {
      const context = getRegionalIngredientContext("Austria");
      expect(context).toContain("Austria-specific");
      expect(context).toContain("Schlagobers");
    });

    it("returns Germany-specific context for Germany", () => {
      const context = getRegionalIngredientContext("Germany");
      expect(context).toContain("Germany-specific");
      expect(context).toContain("Sahne");
    });

    it("returns Switzerland-specific context for Switzerland", () => {
      const context = getRegionalIngredientContext("Switzerland");
      expect(context).toContain("Switzerland-specific");
      expect(context).toContain("Rahm");
    });

    it("returns UK-specific context for United Kingdom", () => {
      const context = getRegionalIngredientContext("United Kingdom");
      expect(context).toContain("United Kingdom-specific");
      expect(context).toContain("coriander");
    });

    it("returns US-specific context for United States", () => {
      const context = getRegionalIngredientContext("United States");
      expect(context).toContain("United States-specific");
      expect(context).toContain("cilantro");
    });

    it("returns generic context for unknown regions", () => {
      const context = getRegionalIngredientContext("Unknown Region");
      expect(context).toContain("appropriate for");
      expect(context).toContain("Unknown Region");
    });

    it("includes examples in the format 'key → value'", () => {
      const context = getRegionalIngredientContext("Austria");
      expect(context).toMatch(/"\w+" → "\w+"/);
      expect(context).toContain("Examples:");
    });

    it("limits the number of examples to keep prompt concise", () => {
      const context = getRegionalIngredientContext("Austria");
      // Count the number of arrow patterns
      const arrowCount = (context.match(/→/g) || []).length;
      // Should be limited (we set it to 6 in the implementation)
      expect(arrowCount).toBeLessThanOrEqual(6);
      expect(arrowCount).toBeGreaterThan(0);
    });

    it("converts underscores to spaces in example keys", () => {
      const context = getRegionalIngredientContext("Austria");
      // "cottage_cheese" should appear as "cottage cheese"
      expect(context).not.toContain("_");
    });

    it("handles US regional variants", () => {
      const eastCoast = getRegionalIngredientContext("United States (East Coast)");
      const westCoast = getRegionalIngredientContext("United States (West Coast)");
      const midwest = getRegionalIngredientContext("United States (Midwest)");

      // All should return context with US ingredients
      expect(eastCoast).toContain("cilantro");
      expect(westCoast).toContain("cilantro");
      expect(midwest).toContain("cilantro");
    });
  });
});
