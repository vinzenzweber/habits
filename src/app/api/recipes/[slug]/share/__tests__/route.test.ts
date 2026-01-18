import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  getRecipeBySlug: vi.fn(),
}));

vi.mock("@/lib/recipe-sharing", () => ({
  shareRecipe: vi.fn(),
  findUserByEmail: vi.fn(),
  getMySharedRecipes: vi.fn(),
  unshareRecipe: vi.fn(),
  updateSharePermission: vi.fn(),
}));

import { GET, POST, PATCH, DELETE } from "../route";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import {
  shareRecipe,
  findUserByEmail,
  getMySharedRecipes,
  unshareRecipe,
  updateSharePermission,
} from "@/lib/recipe-sharing";

const mockAuth = vi.mocked(auth);
const mockGetRecipeBySlug = vi.mocked(getRecipeBySlug);
const mockShareRecipe = vi.mocked(shareRecipe);
const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockGetMySharedRecipes = vi.mocked(getMySharedRecipes);
const mockUnshareRecipe = vi.mocked(unshareRecipe);
const mockUpdateSharePermission = vi.mocked(updateSharePermission);

function createRequest(method: string, body?: object, searchParams?: string): Request {
  const url = `http://localhost/api/recipes/test-slug/share${searchParams ? `?${searchParams}` : ''}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
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

describe("GET /api/recipes/[slug]/share", () => {
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

  it("returns shares for the recipe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockGetMySharedRecipes.mockResolvedValue([
      {
        shareId: 1,
        recipeId: 1,
        recipeSummary: { slug: "test-recipe", title: "Test Recipe", description: "", tags: [], servings: 2, nutrition: { calories: 100, protein: 10, carbohydrates: 20, fat: 5 }, isFavorite: false, updatedAt: new Date() },
        sharedWith: { id: 2, name: "User 2", email: "user2@example.com" },
        permission: "view" as const,
        message: null,
        sharedAt: new Date(),
      },
    ]);

    const request = createRequest("GET");
    const response = await GET(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shares).toHaveLength(1);
    expect(data.shares[0].shareId).toBe(1);
  });
});

describe("POST /api/recipes/[slug]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("POST", { recipientEmail: "user@example.com" });
    const response = await POST(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when email is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("POST", {});
    const response = await POST(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Recipient email is required");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(null);

    const request = createRequest("POST", { recipientEmail: "user@example.com" });
    const response = await POST(request, createRouteParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns 404 when recipient not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockFindUserByEmail.mockResolvedValue(null);

    const request = createRequest("POST", { recipientEmail: "unknown@example.com" });
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("shares recipe successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockFindUserByEmail.mockResolvedValue({ id: 2, name: "User 2", email: "user2@example.com" });
    mockShareRecipe.mockResolvedValue({ shareId: 1 });

    const request = createRequest("POST", { recipientEmail: "user2@example.com", permission: "view" });
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareId).toBe(1);
    expect(data.sharedWith.email).toBe("user2@example.com");
  });

  it("returns 400 when trying to share with self", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockFindUserByEmail.mockResolvedValue({ id: 1, name: "Test User", email: "test@example.com" });
    mockShareRecipe.mockRejectedValue(new Error("Cannot share recipe with yourself"));

    const request = createRequest("POST", { recipientEmail: "test@example.com" });
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Cannot share recipe with yourself");
  });

  it("returns 409 when already shared", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockFindUserByEmail.mockResolvedValue({ id: 2, name: "User 2", email: "user2@example.com" });
    mockShareRecipe.mockRejectedValue(new Error("Recipe already shared with this user"));

    const request = createRequest("POST", { recipientEmail: "user2@example.com" });
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Recipe already shared with this user");
  });
});

describe("PATCH /api/recipes/[slug]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("PATCH", { shareId: 1, permission: "edit" });
    const response = await PATCH(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when shareId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("PATCH", { permission: "edit" });
    const response = await PATCH(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Share ID is required");
  });

  it("returns 400 when permission is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("PATCH", { shareId: 1, permission: "invalid" });
    const response = await PATCH(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Permission must be 'view' or 'edit'");
  });

  it("updates permission successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockUpdateSharePermission.mockResolvedValue(undefined);

    const request = createRequest("PATCH", { shareId: 1, permission: "edit" });
    const response = await PATCH(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe("DELETE /api/recipes/[slug]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("DELETE", undefined, "shareId=1");
    const response = await DELETE(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when shareId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("DELETE");
    const response = await DELETE(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Share ID is required");
  });

  it("removes share successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeBySlug.mockResolvedValue(mockRecipe);
    mockUnshareRecipe.mockResolvedValue(undefined);

    const request = createRequest("DELETE", undefined, "shareId=1");
    const response = await DELETE(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
