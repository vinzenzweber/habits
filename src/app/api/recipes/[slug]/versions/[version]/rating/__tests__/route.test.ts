import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  getRecipeBySlug: vi.fn(),
}));

vi.mock("@/lib/recipe-ratings", () => ({
  upsertRating: vi.fn(),
  getUserRatingForVersion: vi.fn(),
  getVersionRatings: vi.fn(),
}));

import { GET, POST } from "../route";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import {
  upsertRating,
  getUserRatingForVersion,
  getVersionRatings,
} from "@/lib/recipe-ratings";

const mockAuth = vi.mocked(auth);
const mockGetRecipeBySlug = vi.mocked(getRecipeBySlug);
const mockUpsertRating = vi.mocked(upsertRating);
const mockGetUserRatingForVersion = vi.mocked(getUserRatingForVersion);
const mockGetVersionRatings = vi.mocked(getVersionRatings);

function createRequest(method: string, body?: object): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request(
    "http://localhost/api/recipes/test-slug/versions/1/rating",
    options
  );
}

function createRouteParams(slug: string, version: string) {
  return { params: Promise.resolve({ slug, version }) };
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

describe("GET /api/recipes/[slug]/versions/[version]/rating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-slug", "1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid version", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("GET");
    const response = await GET(
      request,
      createRouteParams("test-slug", "invalid")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid version");
  });

  it("returns 400 for version less than 1", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-slug", "0"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid version");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(null);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("nonexistent", "1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns version stats and user rating", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockGetVersionRatings.mockResolvedValue({
      version: 1,
      averageRating: 4.5,
      ratingCount: 2,
      ratings: [],
    });
    mockGetUserRatingForVersion.mockResolvedValue({
      id: 1,
      userId: 1,
      userName: "Test User",
      recipeId: 1,
      recipeVersion: 1,
      rating: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versionStats.averageRating).toBe(4.5);
    expect(data.versionStats.ratingCount).toBe(2);
    expect(data.userRating.rating).toBe(5);
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockRejectedValue(new Error("Database error"));

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch ratings");
  });
});

describe("POST /api/recipes/[slug]/versions/[version]/rating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("POST", { rating: 4 });
    const response = await POST(request, createRouteParams("test-slug", "1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid version", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("POST", { rating: 4 });
    const response = await POST(
      request,
      createRouteParams("test-slug", "invalid")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid version");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(null);

    const request = createRequest("POST", { rating: 4 });
    const response = await POST(request, createRouteParams("nonexistent", "1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns 400 for rating below 1", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);

    const request = createRequest("POST", { rating: 0 });
    const response = await POST(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Rating must be between 1 and 5");
  });

  it("returns 400 for rating above 5", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);

    const request = createRequest("POST", { rating: 6 });
    const response = await POST(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Rating must be between 1 and 5");
  });

  it("returns 400 for non-numeric rating", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);

    const request = createRequest("POST", { rating: "four" });
    const response = await POST(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Rating must be between 1 and 5");
  });

  it("creates rating successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockUpsertRating.mockResolvedValue({
      id: 1,
      userId: 1,
      userName: "Test User",
      recipeId: 1,
      recipeVersion: 1,
      rating: 4,
      comment: "Great recipe!",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createRequest("POST", {
      rating: 4,
      comment: "Great recipe!",
    });
    const response = await POST(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rating.rating).toBe(4);
    expect(data.rating.comment).toBe("Great recipe!");
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockUpsertRating.mockRejectedValue(new Error("Database error"));

    const request = createRequest("POST", { rating: 4 });
    const response = await POST(request, createRouteParams("test-recipe", "1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to save rating");
  });
});
