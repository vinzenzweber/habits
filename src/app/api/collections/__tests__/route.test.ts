import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/collection-db", () => ({
  getUserCollections: vi.fn(),
  createCollection: vi.fn(),
}));

import { GET, POST } from "../route";
import { auth } from "@/lib/auth";
import { getUserCollections, createCollection } from "@/lib/collection-db";

const mockAuth = vi.mocked(auth);
const mockGetUserCollections = vi.mocked(getUserCollections);
const mockCreateCollection = vi.mocked(createCollection);

function createRequest(method: string, body?: object): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/collections", options);
}

describe("GET /api/collections", () => {
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

  it("returns collections for authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetUserCollections.mockResolvedValue([
      {
        id: 1,
        name: "Favorites",
        description: "My favorite recipes",
        coverImageUrl: null,
        recipeCount: 5,
        updatedAt: new Date(),
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collections).toHaveLength(1);
    expect(data.collections[0].name).toBe("Favorites");
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetUserCollections.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch collections");
  });
});

describe("POST /api/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("POST", { name: "Test Collection" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("POST", {});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: name");
  });

  it("returns 400 when name is too long", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest("POST", { name: "a".repeat(101) });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Collection name must be 100 characters or less");
  });

  it("creates collection and returns 201", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    const mockCollection = {
      id: 1,
      userId: 1,
      name: "Test Collection",
      description: "A test collection",
      coverImageUrl: null,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateCollection.mockResolvedValue(mockCollection);

    const request = createRequest("POST", {
      name: "Test Collection",
      description: "A test collection",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.collection).toBeDefined();
    expect(data.collection.name).toBe("Test Collection");
    expect(mockCreateCollection).toHaveBeenCalledWith(1, {
      name: "Test Collection",
      description: "A test collection",
      coverImageUrl: undefined,
    });
  });

  it("trims whitespace from inputs", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockCreateCollection.mockResolvedValue({
      id: 1,
      userId: 1,
      name: "Trimmed",
      description: null,
      coverImageUrl: null,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createRequest("POST", { name: "  Trimmed  " });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockCreateCollection).toHaveBeenCalledWith(1, {
      name: "Trimmed",
      description: undefined,
      coverImageUrl: undefined,
    });
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockCreateCollection.mockRejectedValue(new Error("Database error"));

    const request = createRequest("POST", { name: "Test" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create collection");
  });
});
