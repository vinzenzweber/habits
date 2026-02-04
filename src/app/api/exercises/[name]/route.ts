import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getExerciseWithImages, updateExerciseDescription, normalizeExerciseName } from '@/lib/exercise-library';
import { query } from '@/lib/db';

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

/**
 * PATCH /api/exercises/[name]
 * Update exercise description (form cues)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const normalizedName = normalizeExerciseName(decodedName);

  // Look up exercise by normalized name to get its ID
  const exerciseResult = await query(
    `SELECT id FROM exercises WHERE normalized_name = $1`,
    [normalizedName]
  );

  if (exerciseResult.rows.length === 0) {
    return Response.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const exerciseId = exerciseResult.rows[0].id;

  // Parse request body
  let body: { formCues?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { formCues } = body;

  if (formCues === undefined) {
    return Response.json({ error: 'formCues is required' }, { status: 400 });
  }

  if (typeof formCues !== 'string') {
    return Response.json({ error: 'formCues must be a string' }, { status: 400 });
  }

  // Update the exercise description
  const updated = await updateExerciseDescription(exerciseId, formCues.trim());

  if (!updated) {
    return Response.json({ error: 'Failed to update exercise' }, { status: 500 });
  }

  return Response.json({
    id: updated.id,
    name: updated.name,
    formCues: updated.formCues,
    updatedAt: updated.updatedAt
  });
}
