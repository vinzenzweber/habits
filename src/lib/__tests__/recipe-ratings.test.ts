import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import {
  upsertRating,
  getUserRatingForVersion,
  getVersionRatings,
  getRatingHistory,
  getCurrentVersionAverageRating,
  deleteRating,
} from "../recipe-ratings";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

const mockAuth = vi.mocked(auth);
const mockQuery = vi.mocked(query);

describe("recipe-ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upsertRating", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(
        upsertRating(1, 1, { rating: 4 })
      ).rejects.toThrow("Not authenticated");
    });

    it("creates a new rating", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const mockRow = {
        id: 1,
        user_id: 1,
        recipe_id: 1,
        recipe_version: 1,
        rating: 4,
        comment: "Great recipe!",
        created_at: new Date(),
        updated_at: new Date(),
        name: "Test User",
      };

      mockQuery.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await upsertRating(1, 1, {
        rating: 4,
        comment: "Great recipe!",
      });

      expect(result.rating).toBe(4);
      expect(result.comment).toBe("Great recipe!");
      expect(result.userId).toBe(1);
      expect(result.userName).toBe("Test User");
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("updates existing rating on conflict", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const mockRow = {
        id: 1,
        user_id: 1,
        recipe_id: 1,
        recipe_version: 1,
        rating: 5, // Updated from 4 to 5
        comment: "Updated comment",
        created_at: new Date(),
        updated_at: new Date(),
        name: "Test User",
      };

      mockQuery.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await upsertRating(1, 1, {
        rating: 5,
        comment: "Updated comment",
      });

      expect(result.rating).toBe(5);
      expect(result.comment).toBe("Updated comment");
    });
  });

  describe("getUserRatingForVersion", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(
        getUserRatingForVersion(1, 1)
      ).rejects.toThrow("Not authenticated");
    });

    it("returns null when no rating exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await getUserRatingForVersion(1, 1);

      expect(result).toBeNull();
    });

    it("returns user rating when exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const mockRow = {
        id: 1,
        user_id: 1,
        recipe_id: 1,
        recipe_version: 1,
        rating: 4,
        comment: "Tasty!",
        created_at: new Date(),
        updated_at: new Date(),
        name: "Test User",
      };

      mockQuery.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await getUserRatingForVersion(1, 1);

      expect(result).not.toBeNull();
      expect(result!.rating).toBe(4);
      expect(result!.comment).toBe("Tasty!");
    });
  });

  describe("getVersionRatings", () => {
    it("returns empty stats when no ratings exist", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await getVersionRatings(1, 1);

      expect(result.version).toBe(1);
      expect(result.averageRating).toBe(0);
      expect(result.ratingCount).toBe(0);
      expect(result.ratings).toHaveLength(0);
    });

    it("calculates correct average for multiple ratings", async () => {
      const mockRows = [
        {
          id: 1,
          user_id: 1,
          recipe_id: 1,
          recipe_version: 1,
          rating: 5,
          comment: null,
          created_at: new Date(),
          updated_at: new Date(),
          name: "User 1",
        },
        {
          id: 2,
          user_id: 2,
          recipe_id: 1,
          recipe_version: 1,
          rating: 4,
          comment: "Good",
          created_at: new Date(),
          updated_at: new Date(),
          name: "User 2",
        },
        {
          id: 3,
          user_id: 3,
          recipe_id: 1,
          recipe_version: 1,
          rating: 3,
          comment: null,
          created_at: new Date(),
          updated_at: new Date(),
          name: "User 3",
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 3 });

      const result = await getVersionRatings(1, 1);

      // Average: (5 + 4 + 3) / 3 = 4
      expect(result.averageRating).toBe(4);
      expect(result.ratingCount).toBe(3);
      expect(result.ratings).toHaveLength(3);
    });

    it("rounds average to one decimal place", async () => {
      const mockRows = [
        {
          id: 1,
          user_id: 1,
          recipe_id: 1,
          recipe_version: 1,
          rating: 5,
          comment: null,
          created_at: new Date(),
          updated_at: new Date(),
          name: "User 1",
        },
        {
          id: 2,
          user_id: 2,
          recipe_id: 1,
          recipe_version: 1,
          rating: 4,
          comment: null,
          created_at: new Date(),
          updated_at: new Date(),
          name: "User 2",
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows, rowCount: 2 });

      const result = await getVersionRatings(1, 1);

      // Average: (5 + 4) / 2 = 4.5
      expect(result.averageRating).toBe(4.5);
    });
  });

  describe("getRatingHistory", () => {
    it("returns empty history when no ratings exist", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await getRatingHistory(1);

      expect(result).toHaveLength(0);
    });

    it("returns history for multiple versions", async () => {
      // First query returns distinct versions
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ recipe_version: 2 }, { recipe_version: 1 }],
          rowCount: 2,
        })
        // Second query for version 2 ratings
        .mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              user_id: 1,
              recipe_id: 1,
              recipe_version: 2,
              rating: 5,
              comment: null,
              created_at: new Date(),
              updated_at: new Date(),
              name: "User 1",
            },
          ],
          rowCount: 1,
        })
        // Third query for version 1 ratings
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: 1,
              recipe_id: 1,
              recipe_version: 1,
              rating: 4,
              comment: null,
              created_at: new Date(),
              updated_at: new Date(),
              name: "User 1",
            },
            {
              id: 2,
              user_id: 2,
              recipe_id: 1,
              recipe_version: 1,
              rating: 3,
              comment: null,
              created_at: new Date(),
              updated_at: new Date(),
              name: "User 2",
            },
          ],
          rowCount: 2,
        });

      const result = await getRatingHistory(1);

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[0].ratingCount).toBe(1);
      expect(result[1].version).toBe(1);
      expect(result[1].ratingCount).toBe(2);
    });
  });

  describe("getCurrentVersionAverageRating", () => {
    it("returns null when no ratings exist", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ avg: null, count: "0" }],
        rowCount: 1,
      });

      const result = await getCurrentVersionAverageRating(1, 1);

      expect(result).toBeNull();
    });

    it("returns average and count when ratings exist", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ avg: "4.5", count: "10" }],
        rowCount: 1,
      });

      const result = await getCurrentVersionAverageRating(1, 1);

      expect(result).not.toBeNull();
      expect(result!.averageRating).toBe(4.5);
      expect(result!.ratingCount).toBe(10);
    });
  });

  describe("deleteRating", () => {
    it("throws error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(deleteRating(1, 1)).rejects.toThrow("Not authenticated");
    });

    it("deletes user rating for version", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      await expect(deleteRating(1, 1)).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });
});
