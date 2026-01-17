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

function createRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/chat/sessions");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString(), { method: "GET" });
}

const mockSessions = [
  {
    id: 3,
    title: "Workout modification help",
    created_at: new Date("2024-01-17T10:00:00Z"),
    preview: "How can I modify the Monday workout?",
    message_count: 8,
  },
  {
    id: 2,
    title: null,
    created_at: new Date("2024-01-16T15:30:00Z"),
    preview: "What exercises help with back pain?",
    message_count: 4,
  },
  {
    id: 1,
    title: "Getting started",
    created_at: new Date("2024-01-15T09:00:00Z"),
    preview: null,
    message_count: 0,
  },
];

describe("GET /api/chat/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request);
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
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns empty array when user has no sessions", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBeNull();
  });

  it("returns sessions ordered by creation date (newest first)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: mockSessions, rowCount: mockSessions.length });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toHaveLength(3);
    expect(data.sessions[0].id).toBe(3);
    expect(data.sessions[1].id).toBe(2);
    expect(data.sessions[2].id).toBe(1);
  });

  it("includes preview from first user message", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: mockSessions, rowCount: mockSessions.length });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions[0].preview).toBe("How can I modify the Monday workout?");
    expect(data.sessions[2].preview).toBeNull();
  });

  it("includes message count", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: mockSessions, rowCount: mockSessions.length });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions[0].messageCount).toBe(8);
    expect(data.sessions[1].messageCount).toBe(4);
    expect(data.sessions[2].messageCount).toBe(0);
  });

  it("handles sessions with null title", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: mockSessions, rowCount: mockSessions.length });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions[1].title).toBeNull();
  });

  it("respects default pagination limit of 20", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    await GET(request);

    // Verify query was called with limit of 21 (20 + 1 to check hasMore)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT $2"),
      ["1", 21]
    );
  });

  it("respects custom pagination limit", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest({ limit: "10" });
    await GET(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT $2"),
      ["1", 11]
    );
  });

  it("caps pagination limit at 50", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest({ limit: "100" });
    await GET(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT $2"),
      ["1", 51]
    );
  });

  it("handles cursor-based pagination", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [mockSessions[2]], rowCount: 1 });

    const request = createRequest({ cursor: "2" });
    await GET(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("AND cs.id < $3"),
      ["1", 21, "2"]
    );
  });

  it("returns hasMore true and nextCursor when more results exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    // Return 21 results (one more than limit of 20)
    const manyResults = Array.from({ length: 21 }, (_, i) => ({
      id: 100 - i,
      title: `Session ${100 - i}`,
      created_at: new Date(),
      preview: null,
      message_count: i,
    }));
    mockQuery.mockResolvedValueOnce({ rows: manyResults, rowCount: manyResults.length });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toHaveLength(20);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBe(81); // Last item's id in the returned page
  });

  it("returns hasMore false when no more results", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: mockSessions, rowCount: mockSessions.length });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBeNull();
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockRejectedValue(new Error("Database connection failed"));

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch chat sessions");
  });

  it("verifies SQL query selects correct fields with subqueries", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    await GET(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("cs.id"),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("cs.title"),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("cs.created_at"),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SUBSTRING"),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("COUNT(*)"),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY cs.created_at DESC"),
      expect.any(Array)
    );
  });

  it("only returns sessions belonging to the authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "5", email: "user5@example.com" },
      expires: new Date().toISOString(),
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const request = createRequest();
    await GET(request);

    // Verify query is filtered by user_id
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE cs.user_id = $1"),
      expect.arrayContaining(["5"])
    );
  });
});
