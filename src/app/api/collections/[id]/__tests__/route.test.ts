import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the routes
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/collection-db", () => ({
  getCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));

import { GET, PATCH, DELETE } from "../route";
import { auth } from "@/lib/auth";
import {
  getCollection,
  updateCollection,
  deleteCollection,
} from "@/lib/collection-db";

const mockAuth = vi.mocked(auth);
const mockGetCollection = vi.mocked(getCollection);
const mockUpdateCollection = vi.mocked(updateCollection);
const mockDeleteCollection = vi.mocked(deleteCollection);

function createRequest(method: string, body?: object): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/collections/1", options);
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/collections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(createRequest("GET"), createContext("1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid collection ID", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const response = await GET(createRequest("GET"), createContext("invalid"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid collection ID");
  });

  it("returns 404 when collection not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetCollection.mockResolvedValue(null);

    const response = await GET(createRequest("GET"), createContext("1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Collection not found");
  });

  it("returns collection with recipes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockGetCollection.mockResolvedValue({
      id: 1,
      userId: 1,
      name: "Favorites",
      description: "My favorites",
      coverImageUrl: null,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      recipes: [],
      recipeCount: 0,
    });

    const response = await GET(createRequest("GET"), createContext("1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collection.name).toBe("Favorites");
    expect(data.collection.recipes).toEqual([]);
  });
});

describe("PATCH /api/collections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await PATCH(
      createRequest("PATCH", { name: "Updated" }),
      createContext("1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when name is empty string", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const response = await PATCH(
      createRequest("PATCH", { name: "   " }),
      createContext("1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name cannot be empty");
  });

  it("returns 400 when name is too long", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const response = await PATCH(
      createRequest("PATCH", { name: "a".repeat(101) }),
      createContext("1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Collection name must be 100 characters or less");
  });

  it("updates collection successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateCollection.mockResolvedValue({
      id: 1,
      userId: 1,
      name: "Updated Name",
      description: "Updated description",
      coverImageUrl: null,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await PATCH(
      createRequest("PATCH", {
        name: "Updated Name",
        description: "Updated description",
      }),
      createContext("1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collection.name).toBe("Updated Name");
    expect(mockUpdateCollection).toHaveBeenCalledWith(1, 1, {
      name: "Updated Name",
      description: "Updated description",
    });
  });

  it("returns 404 when collection not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockUpdateCollection.mockRejectedValue(new Error("Collection not found"));

    const response = await PATCH(
      createRequest("PATCH", { name: "Updated" }),
      createContext("1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Collection not found");
  });
});

describe("DELETE /api/collections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await DELETE(createRequest("DELETE"), createContext("1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("deletes collection successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockDeleteCollection.mockResolvedValue(undefined);

    const response = await DELETE(createRequest("DELETE"), createContext("1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteCollection).toHaveBeenCalledWith(1, 1);
  });

  it("returns 404 when collection not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockDeleteCollection.mockRejectedValue(new Error("Collection not found"));

    const response = await DELETE(createRequest("DELETE"), createContext("1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Collection not found");
  });
});
