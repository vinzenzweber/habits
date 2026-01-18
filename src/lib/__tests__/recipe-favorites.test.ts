import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import {
  isRecipeFavorite,
  addFavorite,
  removeFavorite,
  getUserFavoriteRecipeIds,
  getFavoriteStatusBySlug,
} from "../recipe-favorites";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

const mockAuth = vi.mocked(auth);
const mockQuery = vi.mocked(query);

describe("recipe-favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isRecipeFavorite", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(isRecipeFavorite(1)).rejects.toThrow("Not authenticated");
    });

    it("returns true when recipe is favorited", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [{ exists: true }],
        rowCount: 1,
      });

      const result = await isRecipeFavorite(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("returns false when recipe is not favorited", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [{ exists: false }],
        rowCount: 1,
      });

      const result = await isRecipeFavorite(1);

      expect(result).toBe(false);
    });

    it("returns false when no rows returned", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await isRecipeFavorite(1);

      expect(result).toBe(false);
    });
  });

  describe("addFavorite", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(addFavorite(1)).rejects.toThrow("Not authenticated");
    });

    it("adds a recipe to favorites", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, user_id: 1, recipe_id: 1, created_at: new Date() }],
        rowCount: 1,
      });

      await expect(addFavorite(1)).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO recipe_favorites"),
        [1, 1]
      );
    });

    it("does not throw error when already favorited (ON CONFLICT DO NOTHING)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0, // No row returned due to conflict
      });

      await expect(addFavorite(1)).resolves.toBeUndefined();
    });
  });

  describe("removeFavorite", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(removeFavorite(1)).rejects.toThrow("Not authenticated");
    });

    it("removes a recipe from favorites", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      await expect(removeFavorite(1)).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM recipe_favorites"),
        [1, 1]
      );
    });

    it("does not throw error when recipe was not favorited", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0, // No row deleted
      });

      await expect(removeFavorite(1)).resolves.toBeUndefined();
    });
  });

  describe("getUserFavoriteRecipeIds", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getUserFavoriteRecipeIds()).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("returns empty array when no favorites", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await getUserFavoriteRecipeIds();

      expect(result).toEqual([]);
    });

    it("returns array of recipe IDs", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [{ recipe_id: 1 }, { recipe_id: 5 }, { recipe_id: 10 }],
        rowCount: 3,
      });

      const result = await getUserFavoriteRecipeIds();

      expect(result).toEqual([1, 5, 10]);
    });
  });

  describe("getFavoriteStatusBySlug", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getFavoriteStatusBySlug("test-recipe")).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("returns null when recipe not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await getFavoriteStatusBySlug("nonexistent-recipe");

      expect(result).toBeNull();
    });

    it("returns recipe ID and favorite status true", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [{ id: 42, is_favorite: true }],
        rowCount: 1,
      });

      const result = await getFavoriteStatusBySlug("my-recipe");

      expect(result).toEqual({ recipeId: 42, isFavorite: true });
    });

    it("returns recipe ID and favorite status false", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({
        rows: [{ id: 42, is_favorite: false }],
        rowCount: 1,
      });

      const result = await getFavoriteStatusBySlug("my-recipe");

      expect(result).toEqual({ recipeId: 42, isFavorite: false });
    });
  });
});
