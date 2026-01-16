import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  getRecipeVersions: vi.fn(),
}));

import { GET } from "../route";
import { auth } from "@/lib/auth";
import { getRecipeVersions } from "@/lib/recipes";

const mockAuth = vi.mocked(auth);
const mockGetRecipeVersions = vi.mocked(getRecipeVersions);

function createRequest(queryParams?: string): Request {
  const url = queryParams
    ? `http://localhost/api/recipes/test-slug/versions?${queryParams}`
    : "http://localhost/api/recipes/test-slug/versions";
  return new Request(url, { method: "GET" });
}

function createRouteParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

const mockVersions = [
  {
    version: 3,
    title: "Updated Title",
    description: "Latest version",
    createdAt: new Date("2024-01-03"),
    isActive: true,
  },
  {
    version: 2,
    title: "Second Update",
    description: "Second version",
    createdAt: new Date("2024-01-02"),
    isActive: false,
  },
  {
    version: 1,
    title: "Original Title",
    description: "First version",
    createdAt: new Date("2024-01-01"),
    isActive: false,
  },
];

describe("GET /api/recipes/[slug]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns all versions for a recipe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions);

    const request = createRequest();
    const response = await GET(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versions).toHaveLength(3);
    expect(data.versions[0].version).toBe(3);
    expect(data.versions[0].isActive).toBe(true);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", {});
  });

  it("returns empty array when no versions exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue([]);

    const request = createRequest();
    const response = await GET(request, createRouteParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versions).toEqual([]);
  });

  it("supports limit query parameter", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions.slice(0, 2));

    const request = createRequest("limit=2");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", { limit: 2 });
  });

  it("supports offset query parameter", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions.slice(1));

    const request = createRequest("offset=1");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", { offset: 1 });
  });

  it("supports both limit and offset query parameters", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue([mockVersions[1]]);

    const request = createRequest("limit=1&offset=1");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", { limit: 1, offset: 1 });
  });

  it("ignores invalid limit parameter", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions);

    const request = createRequest("limit=invalid");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", {});
  });

  it("ignores negative limit parameter", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions);

    const request = createRequest("limit=-5");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", {});
  });

  it("ignores negative offset parameter", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions);

    const request = createRequest("offset=-1");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", {});
  });

  it("allows offset of 0", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockResolvedValue(mockVersions);

    const request = createRequest("offset=0");
    const response = await GET(request, createRouteParams("test-recipe"));

    expect(response.status).toBe(200);
    expect(mockGetRecipeVersions).toHaveBeenCalledWith("test-recipe", { offset: 0 });
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetRecipeVersions.mockRejectedValue(new Error("Database error"));

    const request = createRequest();
    const response = await GET(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch recipe versions");
  });
});
