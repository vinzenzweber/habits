import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = 'nodejs';

/**
 * GET /api/chat/sessions
 * Get a paginated list of chat sessions for the authenticated user
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
    const userId = session.user.id;

    // Build query with optional cursor-based pagination
    // Get sessions with the first user message as preview and message count
    const sessionsQuery = `
      SELECT
        cs.id,
        cs.title,
        cs.created_at,
        (
          SELECT SUBSTRING(cm.content, 1, 100)
          FROM chat_messages cm
          WHERE cm.session_id = cs.id AND cm.role = 'user'
          ORDER BY cm.created_at ASC
          LIMIT 1
        ) as preview,
        (
          SELECT COUNT(*)::int
          FROM chat_messages cm
          WHERE cm.session_id = cs.id
        ) as message_count
      FROM chat_sessions cs
      WHERE cs.user_id = $1
        ${cursor ? 'AND cs.id < $3' : ''}
      ORDER BY cs.created_at DESC
      LIMIT $2
    `;

    const params = cursor ? [userId, limit + 1, cursor] : [userId, limit + 1];
    const result = await query(sessionsQuery, params);

    // Check if there are more results
    const hasMore = result.rows.length > limit;
    const sessions = hasMore ? result.rows.slice(0, limit) : result.rows;

    // Get the next cursor (last session id in this page)
    const nextCursor = hasMore && sessions.length > 0
      ? sessions[sessions.length - 1].id
      : null;

    return Response.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        createdAt: s.created_at,
        preview: s.preview,
        messageCount: s.message_count
      })),
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return Response.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}
