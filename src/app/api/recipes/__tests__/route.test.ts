import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  getUserRecipeSummaries: vi.fn(),
  createRecipe: vi.fn(),
}));

import { GET, POST } from "../route";
import { auth } from "@/lib/auth";
import { getUserRecipeSummaries, createRecipe } from "@/lib/recipes";

const mockAuth = vi.mocked(auth);
const mockGetUserRecipeSummaries = vi.mocked(getUserRecipeSummaries);
const mockCreateRecipe = vi.mocked(createRecipe);

function createRequest(method: string, body?: object): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/recipes", options);
}

describe("GET /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns recipes for authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetUserRecipeSummaries.mockResolvedValue([
      {
        slug: "test-recipe",
        title: "Test Recipe",
        description: "A test",
        tags: ["breakfast"],
        servings: 2,
        nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 },
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recipes).toHaveLength(1);
    expect(data.recipes[0].slug).toBe("test-recipe");
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetUserRecipeSummaries.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch recipes");
  });
});

describe("POST /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validRecipeInput = {
    title: "New Recipe",
    recipeJson: {
      slug: "new-recipe",
      title: "New Recipe",
      description: "A new recipe",
      tags: ["dinner"],
      servings: 4,
      nutrition: { calories: 400, protein: 30, carbohydrates: 40, fat: 15 },
      ingredientGroups: [],
      steps: [],
      images: [{ url: "/img.jpg" }],
      locale: "en-US",
    },
  };

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("POST", validRecipeInput);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when title is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("POST", { recipeJson: validRecipeInput.recipeJson });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields: title and recipeJson");
  });

  it("returns 400 when recipeJson is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("POST", { title: "Test" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields: title and recipeJson");
  });

  it("creates recipe and returns recipe object", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    const mockRecipe = {
      id: 1,
      userId: 1,
      slug: "new-recipe",
      version: 1,
      title: "New Recipe",
      description: null,
      locale: "en-US",
      tags: ["dinner"],
      recipeJson: validRecipeInput.recipeJson,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateRecipe.mockResolvedValue(mockRecipe);

    const request = createRequest("POST", validRecipeInput);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.recipe).toBeDefined();
    expect(data.recipe.slug).toBe("new-recipe");
    expect(data.recipe.version).toBe(1);
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockCreateRecipe.mockRejectedValue(new Error("Database error"));

    const request = createRequest("POST", validRecipeInput);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create recipe");
  });
});
