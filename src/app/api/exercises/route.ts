import { auth } from '@/lib/auth';
import { getAllExercisesForManagement } from '@/lib/exercise-library';

export const runtime = 'nodejs';

/**
 * GET /api/exercises
 * Get all exercises for management UI
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exercises = await getAllExercisesForManagement();

  return Response.json({ exercises });
}
