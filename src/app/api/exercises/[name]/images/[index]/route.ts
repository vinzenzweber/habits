import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getExerciseWithImages } from '@/lib/exercise-library';
import { readExerciseImage } from '@/lib/image-storage';

export const runtime = 'nodejs';

/**
 * GET /api/exercises/[name]/images/[index]
 * Serve exercise image from storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; index: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { name, index } = await params;
  const decodedName = decodeURIComponent(name);
  const imageIndex = parseInt(index);

  // Validate image index
  if (imageIndex !== 1 && imageIndex !== 2) {
    return new Response('Invalid image index. Must be 1 or 2.', { status: 400 });
  }

  // Get exercise with images
  const exercise = await getExerciseWithImages(decodedName);

  if (!exercise) {
    return new Response('Exercise not found', { status: 404 });
  }

  // Find the requested image
  const image = exercise.images.find(img => img.imageIndex === imageIndex);

  if (!image) {
    return new Response('Image not found', { status: 404 });
  }

  if (image.generationStatus !== 'complete') {
    return new Response(`Image generation ${image.generationStatus}`, { status: 404 });
  }

  try {
    const imageBuffer = await readExerciseImage(image.storagePath);

    // Convert Buffer to Uint8Array for Response constructor
    return new Response(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': imageBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error reading exercise image:', error);
    return new Response('Image file not found', { status: 404 });
  }
}
