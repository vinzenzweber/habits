import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/chat/sessions/[id]
 * Get a chat session with all its messages
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = session.user.id;

    // Get session (verify existence and ownership in single query)
    const sessionResult = await query(`
      SELECT id, user_id, title, created_at
      FROM chat_sessions
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (!sessionResult.rows[0]) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const chatSession = sessionResult.rows[0];

    // Get all messages for this session, ordered chronologically
    const messagesResult = await query(`
      SELECT id, role, content, tool_calls, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [id]);

    return Response.json({
      session: {
        id: chatSession.id,
        title: chatSession.title,
        createdAt: chatSession.created_at,
        messages: messagesResult.rows.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          toolCalls: msg.tool_calls,
          createdAt: msg.created_at
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching chat session:", error);
    return Response.json(
      { error: "Failed to fetch chat session" },
      { status: 500 }
    );
  }
}
