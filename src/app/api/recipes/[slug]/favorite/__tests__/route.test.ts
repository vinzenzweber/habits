import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipe-favorites", () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  getFavoriteStatusBySlug: vi.fn(),
}));

import { GET, POST, DELETE } from "../route";
import { auth } from "@/lib/auth";
import {
  addFavorite,
  removeFavorite,
  getFavoriteStatusBySlug,
} from "@/lib/recipe-favorites";

const mockAuth = vi.mocked(auth);
const mockAddFavorite = vi.mocked(addFavorite);
const mockRemoveFavorite = vi.mocked(removeFavorite);
const mockGetFavoriteStatusBySlug = vi.mocked(getFavoriteStatusBySlug);

function createRequest(method: string = "GET"): Request {
  return new Request("http://localhost/api/recipes/test-recipe/favorite", {
    method,
  });
}

const mockParams = { params: Promise.resolve({ slug: "test-recipe" }) };

describe("GET /api/recipes/[slug]/favorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns favorite status true", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue({
      recipeId: 42,
      isFavorite: true,
    });

    const request = createRequest();
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isFavorite).toBe(true);
  });

  it("returns favorite status false", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue({
      recipeId: 42,
      isFavorite: false,
    });

    const request = createRequest();
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isFavorite).toBe(false);
  });

  it("returns 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockRejectedValue(new Error("Database error"));

    const request = createRequest();
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch favorite status");
  });
});

describe("POST /api/recipes/[slug]/favorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("POST");
    const response = await POST(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue(null);

    const request = createRequest("POST");
    const response = await POST(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("adds recipe to favorites successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue({
      recipeId: 42,
      isFavorite: false,
    });
    mockAddFavorite.mockResolvedValue(undefined);

    const request = createRequest("POST");
    const response = await POST(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isFavorite).toBe(true);
    expect(mockAddFavorite).toHaveBeenCalledWith(42);
  });

  it("returns 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue({
      recipeId: 42,
      isFavorite: false,
    });
    mockAddFavorite.mockRejectedValue(new Error("Database error"));

    const request = createRequest("POST");
    const response = await POST(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to add favorite");
  });
});

describe("DELETE /api/recipes/[slug]/favorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("DELETE");
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue(null);

    const request = createRequest("DELETE");
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("removes recipe from favorites successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue({
      recipeId: 42,
      isFavorite: true,
    });
    mockRemoveFavorite.mockResolvedValue(undefined);

    const request = createRequest("DELETE");
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isFavorite).toBe(false);
    expect(mockRemoveFavorite).toHaveBeenCalledWith(42);
  });

  it("returns 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetFavoriteStatusBySlug.mockResolvedValue({
      recipeId: 42,
      isFavorite: true,
    });
    mockRemoveFavorite.mockRejectedValue(new Error("Database error"));

    const request = createRequest("DELETE");
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to remove favorite");
  });
});
