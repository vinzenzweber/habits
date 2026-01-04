import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = 'nodejs';

const VALID_RATINGS = ['too_easy', 'just_right', 'too_hard'] as const;
type DifficultyRating = typeof VALID_RATINGS[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { difficulty_rating, feedback } = await request.json();

    // Validate rating if provided
    if (difficulty_rating && !VALID_RATINGS.includes(difficulty_rating as DifficultyRating)) {
      return Response.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Update completion (only if owned by user)
    const result = await query(`
      UPDATE workout_completions
      SET difficulty_rating = COALESCE($1, difficulty_rating),
          feedback = COALESCE($2, feedback)
      WHERE id = $3 AND user_id = $4
      RETURNING id
    `, [difficulty_rating || null, feedback || null, id, session.user.id]);

    if (!result.rows[0]) {
      return Response.json({ error: "Completion not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return Response.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
