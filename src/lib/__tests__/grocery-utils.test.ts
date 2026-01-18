import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatQuantity,
  groupItemsByCategory,
  getCategoryLabel,
  getCategoryIcon,
  CATEGORY_CONFIG,
} from "../grocery-utils";
import { GroceryListItem, GroceryCategory } from "../grocery-types";

describe("Grocery Utils", () => {
  describe("CATEGORY_CONFIG", () => {
    it("has config for all grocery categories", () => {
      const categories: GroceryCategory[] = [
        "produce",
        "dairy",
        "meat",
        "bakery",
        "pantry",
        "frozen",
        "beverages",
        "other",
      ];

      for (const cat of categories) {
        expect(CATEGORY_CONFIG[cat]).toBeDefined();
        expect(CATEGORY_CONFIG[cat].icon).toBeTruthy();
        expect(CATEGORY_CONFIG[cat].label).toBeTruthy();
      }
    });
  });

  describe("formatRelativeTime", () => {
    it('returns "just now" for times less than a minute ago', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      expect(formatRelativeTime(thirtySecondsAgo)).toBe("just now");
    });

    it("formats minutes ago correctly", () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      expect(formatRelativeTime(twoMinutesAgo)).toBe("2m ago");

      const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000);
      expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe("59m ago");
    });

    it("formats hours ago correctly", () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");

      const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
      expect(formatRelativeTime(twentyThreeHoursAgo)).toBe("23h ago");
    });

    it("formats days ago correctly", () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");

      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(sixDaysAgo)).toBe("6d ago");
    });

    it("formats dates older than a week as locale date string", () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoWeeksAgo);
      // Should be a date string, not "Xd ago"
      expect(result).not.toContain("d ago");
      expect(result).not.toContain("h ago");
      expect(result).not.toContain("m ago");
    });
  });

  describe("formatQuantity", () => {
    it("returns empty string for null quantity", () => {
      expect(formatQuantity(null, null)).toBe("");
      expect(formatQuantity(null, "lbs")).toBe("");
    });

    it("returns quantity as string when unit is null or empty", () => {
      expect(formatQuantity(2, null)).toBe("2");
      expect(formatQuantity(5, "")).toBe("5");
      expect(formatQuantity(3.5, "  ")).toBe("3.5");
    });

    it("formats quantity with unit correctly", () => {
      expect(formatQuantity(2, "lbs")).toBe("2 lbs");
      expect(formatQuantity(500, "g")).toBe("500 g");
      expect(formatQuantity(1, "head")).toBe("1 head");
      expect(formatQuantity(0.5, "kg")).toBe("0.5 kg");
    });
  });

  describe("groupItemsByCategory", () => {
    const createItem = (
      id: number,
      category: GroceryCategory | null
    ): GroceryListItem => ({
      id,
      listId: 1,
      ingredientName: `Item ${id}`,
      quantity: null,
      unit: null,
      category,
      checked: false,
      checkedByUserId: null,
      checkedAt: null,
      fromRecipeId: null,
      position: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("groups items by their category", () => {
      const items = [
        createItem(1, "produce"),
        createItem(2, "dairy"),
        createItem(3, "produce"),
        createItem(4, "meat"),
      ];

      const groups = groupItemsByCategory(items);

      expect(groups.get("produce")).toHaveLength(2);
      expect(groups.get("dairy")).toHaveLength(1);
      expect(groups.get("meat")).toHaveLength(1);
    });

    it('groups items without category as "uncategorized"', () => {
      const items = [
        createItem(1, null),
        createItem(2, "produce"),
        createItem(3, null),
      ];

      const groups = groupItemsByCategory(items);

      expect(groups.get("uncategorized")).toHaveLength(2);
      expect(groups.get("produce")).toHaveLength(1);
    });

    it("does not include empty groups", () => {
      const items = [createItem(1, "produce"), createItem(2, "produce")];

      const groups = groupItemsByCategory(items);

      expect(groups.has("produce")).toBe(true);
      expect(groups.has("dairy")).toBe(false);
      expect(groups.has("meat")).toBe(false);
    });

    it("handles empty items array", () => {
      const groups = groupItemsByCategory([]);
      expect(groups.size).toBe(0);
    });

    it("preserves category order", () => {
      const items = [
        createItem(1, "beverages"),
        createItem(2, "produce"),
        createItem(3, "frozen"),
      ];

      const groups = groupItemsByCategory(items);
      const categories = Array.from(groups.keys());

      // produce should come before frozen, and frozen before beverages
      const produceIndex = categories.indexOf("produce");
      const frozenIndex = categories.indexOf("frozen");
      const beveragesIndex = categories.indexOf("beverages");

      expect(produceIndex).toBeLessThan(frozenIndex);
      expect(frozenIndex).toBeLessThan(beveragesIndex);
    });
  });

  describe("getCategoryLabel", () => {
    it("returns the correct label for each category", () => {
      expect(getCategoryLabel("produce")).toBe("Produce");
      expect(getCategoryLabel("dairy")).toBe("Dairy");
      expect(getCategoryLabel("meat")).toBe("Meat");
      expect(getCategoryLabel("bakery")).toBe("Bakery");
      expect(getCategoryLabel("pantry")).toBe("Pantry");
      expect(getCategoryLabel("frozen")).toBe("Frozen");
      expect(getCategoryLabel("beverages")).toBe("Beverages");
      expect(getCategoryLabel("other")).toBe("Other");
    });

    it('returns "Uncategorized" for uncategorized', () => {
      expect(getCategoryLabel("uncategorized")).toBe("Uncategorized");
    });
  });

  describe("getCategoryIcon", () => {
    it("returns an icon for each category", () => {
      expect(getCategoryIcon("produce")).toBeTruthy();
      expect(getCategoryIcon("dairy")).toBeTruthy();
      expect(getCategoryIcon("meat")).toBeTruthy();
      expect(getCategoryIcon("uncategorized")).toBeTruthy();
    });

    it("returns different icons for different categories", () => {
      const icons = new Set([
        getCategoryIcon("produce"),
        getCategoryIcon("dairy"),
        getCategoryIcon("meat"),
        getCategoryIcon("bakery"),
      ]);
      expect(icons.size).toBe(4);
    });
  });
});
