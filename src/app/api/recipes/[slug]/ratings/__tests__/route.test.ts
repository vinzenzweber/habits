import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  getRecipeBySlug: vi.fn(),
}));

vi.mock("@/lib/recipe-ratings", () => ({
  getRatingHistory: vi.fn(),
}));

import { GET } from "../route";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import { getRatingHistory } from "@/lib/recipe-ratings";

const mockAuth = vi.mocked(auth);
const mockGetRecipeBySlug = vi.mocked(getRecipeBySlug);
const mockGetRatingHistory = vi.mocked(getRatingHistory);

function createRequest(method: string): Request {
  return new Request("http://localhost/api/recipes/test-slug/ratings", {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

function createRouteParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

const mockRecipe = {
  id: 1,
  userId: 1,
  slug: "test-recipe",
  version: 1,
  title: "Test Recipe",
  description: "A test recipe",
  locale: "en-US",
  tags: ["breakfast"],
  recipeJson: {
    slug: "test-recipe",
    title: "Test Recipe",
    description: "A test recipe",
    tags: ["breakfast"],
    servings: 2,
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

describe("GET /api/recipes/[slug]/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(null);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns rating history for recipe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockGetRatingHistory.mockResolvedValue([
      {
        version: 1,
        averageRating: 4.5,
        ratingCount: 2,
        ratings: [
          {
            userId: 1,
            userName: "User 1",
            rating: 5,
            createdAt: new Date().toISOString(),
          },
          {
            userId: 2,
            userName: "User 2",
            rating: 4,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ]);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ratingHistory).toHaveLength(1);
    expect(data.ratingHistory[0].version).toBe(1);
    expect(data.ratingHistory[0].averageRating).toBe(4.5);
    expect(data.ratingHistory[0].ratingCount).toBe(2);
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockRejectedValue(new Error("Database error"));

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch ratings");
  });
});
