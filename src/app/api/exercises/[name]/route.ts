import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getExerciseWithImages } from '@/lib/exercise-library';

export const runtime = 'nodejs';

/**
 * GET /api/exercises/[name]
 * Get exercise info with image URLs and status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const exercise = await getExerciseWithImages(decodedName);

  if (!exercise) {
    return Response.json({ error: 'Exercise not found' }, { status: 404 });
  }

  // Build image info with URLs for complete images
  const images = exercise.images.map(img => ({
    index: img.imageIndex,
    url: img.generationStatus === 'complete'
      ? `/api/exercises/${encodeURIComponent(exercise.name)}/images/${img.imageIndex}`
      : null,
    status: img.generationStatus
  }));

  return Response.json({
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    formCues: exercise.formCues,
    muscleGroups: exercise.muscleGroups,
    equipment: exercise.equipment,
    category: exercise.category,
    images
  });
}
