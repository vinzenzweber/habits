import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  getRecipeBySlug: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  updateRecipeInPlace: vi.fn(),
}));

import { GET, PATCH, PUT, DELETE } from "../route";
import { auth } from "@/lib/auth";
import {
  getRecipeBySlug,
  updateRecipe,
  deleteRecipe,
  updateRecipeInPlace,
} from "@/lib/recipes";

const mockAuth = vi.mocked(auth);
const mockGetRecipeBySlug = vi.mocked(getRecipeBySlug);
const mockUpdateRecipe = vi.mocked(updateRecipe);
const mockDeleteRecipe = vi.mocked(deleteRecipe);
const mockUpdateRecipeInPlace = vi.mocked(updateRecipeInPlace);

function createRequest(method: string, body?: object): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/recipes/test-slug", options);
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

describe("GET /api/recipes/[slug]", () => {
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

  it("returns recipe when found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recipe.slug).toBe("test-recipe");
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
    expect(data.error).toBe("Failed to fetch recipe");
  });
});

describe("PATCH /api/recipes/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("PATCH", { title: "Updated" });
    const response = await PATCH(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("updates recipe and returns updated version", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateRecipe.mockResolvedValue({ ...mockRecipe, version: 2, title: "Updated Recipe" });

    const request = createRequest("PATCH", { title: "Updated Recipe" });
    const response = await PATCH(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recipe.version).toBe(2);
    expect(data.recipe.title).toBe("Updated Recipe");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateRecipe.mockRejectedValue(new Error("Recipe not found"));

    const request = createRequest("PATCH", { title: "Updated" });
    const response = await PATCH(request, createRouteParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateRecipe.mockRejectedValue(new Error("Database error"));

    const request = createRequest("PATCH", { title: "Updated" });
    const response = await PATCH(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update recipe");
  });
});

describe("PUT /api/recipes/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("PUT", { title: "Updated" });
    const response = await PUT(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("updates recipe in place and returns success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateRecipeInPlace.mockResolvedValue({ success: true });

    const request = createRequest("PUT", { title: "Updated Title" });
    const response = await PUT(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 404 when recipe not found or inactive", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateRecipeInPlace.mockRejectedValue(new Error("Recipe not found or inactive"));

    const request = createRequest("PUT", { title: "Updated" });
    const response = await PUT(request, createRouteParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateRecipeInPlace.mockRejectedValue(new Error("Database error"));

    const request = createRequest("PUT", { title: "Updated" });
    const response = await PUT(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update recipe");
  });
});

describe("DELETE /api/recipes/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("DELETE");
    const response = await DELETE(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("deletes recipe and returns success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockDeleteRecipe.mockResolvedValue(undefined);

    const request = createRequest("DELETE");
    const response = await DELETE(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockDeleteRecipe.mockRejectedValue(new Error("Database error"));

    const request = createRequest("DELETE");
    const response = await DELETE(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete recipe");
  });
});
