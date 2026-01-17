import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { GET } from "../route";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

const mockAuth = vi.mocked(auth);
const mockQuery = vi.mocked(query);

function createRequest(): Request {
  return new Request("http://localhost/api/chat/sessions/1", {
    method: "GET",
  });
}

function createRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockSession = {
  id: 1,
  user_id: 1,
  title: "Test Chat Session",
  created_at: new Date("2024-01-15T10:00:00Z"),
};

const mockMessages = [
  {
    id: 1,
    role: "user",
    content: "Hello, I need help with my workout",
    tool_calls: null,
    created_at: new Date("2024-01-15T10:00:00Z"),
  },
  {
    id: 2,
    role: "assistant",
    content: "I'd be happy to help! What would you like to know?",
    tool_calls: null,
    created_at: new Date("2024-01-15T10:00:01Z"),
  },
  {
    id: 3,
    role: "user",
    content: "Can you modify my Monday workout?",
    tool_calls: null,
    created_at: new Date("2024-01-15T10:00:02Z"),
  },
  {
    id: 4,
    role: "assistant",
    content: "I've updated your Monday workout.",
    tool_calls: [
      { name: "get_workout", arguments: { slug: "monday" } },
      { name: "update_workout", arguments: { slug: "monday", segments: [] } },
    ],
    created_at: new Date("2024-01-15T10:00:03Z"),
  },
];

describe("GET /api/chat/sessions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when user id is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "test@example.com" },
      expires: new Date().toISOString(),
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when session does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    const response = await GET(request, createRouteParams("999"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Session not found");
  });

  it("returns 404 when session belongs to another user", async () => {
    // User 2 tries to access session owned by user 1
    mockAuth.mockResolvedValue({
      user: { id: "2", email: "other@example.com" },
      expires: new Date().toISOString(),
    });
    // Query returns empty because WHERE user_id = $2 doesn't match
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Session not found");
  });

  it("returns session with messages in chronological order", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    // First query returns the session
    mockQuery.mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 });
    // Second query returns the messages
    mockQuery.mockResolvedValueOnce({ rows: mockMessages, rowCount: mockMessages.length });

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.id).toBe(1);
    expect(data.session.title).toBe("Test Chat Session");
    expect(data.session.messages).toHaveLength(4);

    // Verify messages are in chronological order
    expect(data.session.messages[0].role).toBe("user");
    expect(data.session.messages[0].content).toBe("Hello, I need help with my workout");
    expect(data.session.messages[3].role).toBe("assistant");
    expect(data.session.messages[3].toolCalls).toEqual([
      { name: "get_workout", arguments: { slug: "monday" } },
      { name: "update_workout", arguments: { slug: "monday", segments: [] } },
    ]);
  });

  it("handles sessions with no messages", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.id).toBe(1);
    expect(data.session.messages).toHaveLength(0);
    expect(data.session.messages).toEqual([]);
  });

  it("handles sessions with null title", async () => {
    const sessionWithNullTitle = { ...mockSession, title: null };
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [sessionWithNullTitle], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.title).toBeNull();
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockRejectedValue(new Error("Database connection failed"));

    const request = createRequest();
    const response = await GET(request, createRouteParams("1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch chat session");
  });

  it("verifies correct SQL queries are called", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: mockMessages, rowCount: mockMessages.length });

    const request = createRequest();
    await GET(request, createRouteParams("1"));

    // Verify session query with ownership check
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SELECT id, user_id, title, created_at"),
      ["1", "1"]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE id = $1 AND user_id = $2"),
      ["1", "1"]
    );

    // Verify messages query
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SELECT id, role, content, tool_calls, created_at"),
      ["1"]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("ORDER BY created_at ASC"),
      ["1"]
    );
  });
});
