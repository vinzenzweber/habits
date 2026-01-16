import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/recipes", () => ({
  saveRecipeVersion: vi.fn(),
}));

import { POST } from "../route";
import { auth } from "@/lib/auth";
import { saveRecipeVersion } from "@/lib/recipes";

const mockAuth = vi.mocked(auth);
const mockSaveRecipeVersion = vi.mocked(saveRecipeVersion);

function createRequest(body?: object): Request {
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/recipes/test-slug/version", options);
}

function createRouteParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("POST /api/recipes/[slug]/version", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({ title: "Updated Title" });
    const response = await POST(request, createRouteParams("test-slug"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("creates new version and returns version number", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockSaveRecipeVersion.mockResolvedValue({ version: 2 });

    const request = createRequest({ title: "Updated Title" });
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ version: 2 });
    expect(mockSaveRecipeVersion).toHaveBeenCalledWith("test-recipe", { title: "Updated Title" });
  });

  it("creates new version with multiple fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockSaveRecipeVersion.mockResolvedValue({ version: 3 });

    const updateInput = {
      title: "New Title",
      description: "New Description",
      tags: ["lunch", "quick"],
    };
    const request = createRequest(updateInput);
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ version: 3 });
    expect(mockSaveRecipeVersion).toHaveBeenCalledWith("test-recipe", updateInput);
  });

  it("returns 404 when recipe not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockSaveRecipeVersion.mockRejectedValue(new Error("Recipe not found"));

    const request = createRequest({ title: "Updated" });
    const response = await POST(request, createRouteParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Recipe not found");
  });

  it("returns 500 on error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockSaveRecipeVersion.mockRejectedValue(new Error("Database error"));

    const request = createRequest({ title: "Updated" });
    const response = await POST(request, createRouteParams("test-recipe"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create recipe version");
  });
});
