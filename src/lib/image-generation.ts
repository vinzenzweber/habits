import OpenAI from 'openai';
import { query } from './db';
import { saveExerciseImage } from './image-storage';
import { claimNextJob, completeJob, failJob } from './job-queue';
import { getExerciseById, upsertExerciseImage } from './exercise-library';

// Lazy initialization to avoid requiring OPENAI_API_KEY at build time
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// Consistent style prompt for all exercise illustrations
const STYLE_PROMPT = `Create a clean, modern fitness illustration with these exact specifications:
- Dark slate background color (#0f172a)
- Single athletic person demonstrating the exercise
- Flat design with subtle gradients and clean lines
- Emerald green accent color (#34d399) for highlights and emphasis
- Side-view or 3/4 angle for maximum clarity of form
- Professional, gender-neutral athletic figure
- No text, labels, or watermarks
- High contrast for mobile visibility
- Minimalist style with focus on proper form
- Clean, vector-art aesthetic`;

/**
 * Search for reference information about an exercise using web search
 */
async function getExerciseInfo(exerciseName: string, formCues?: string): Promise<string> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-search-preview',
      messages: [{
        role: 'user',
        content: `Describe the proper form for the exercise "${exerciseName}" in detail.
                 Include: starting position, movement phases, key form cues, and common mistakes to avoid.
                 ${formCues ? `Known form cues: ${formCues}` : ''}
                 Keep the response concise but comprehensive.`
      }],
      web_search_options: { search_context_size: 'medium' }
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Web search error:', error);
    // Fall back to basic description
    return formCues || `The exercise "${exerciseName}" with proper athletic form.`;
  }
}

/**
 * Generate an exercise illustration using OpenAI's image generation
 */
async function generateExerciseImage(
  exerciseName: string,
  exerciseInfo: string,
  imageIndex: 1 | 2
): Promise<Buffer> {
  const positionDesc = imageIndex === 1
    ? 'starting position / setup phase before the movement begins'
    : 'peak contraction / end position at the most challenging point of the movement';

  const prompt = `${STYLE_PROMPT}

Exercise: ${exerciseName}
Phase: Show the ${positionDesc}

Exercise details: ${exerciseInfo}

Create a single, clear illustration showing this exact phase of the exercise.
The figure should demonstrate perfect form for this position.`;

  try {
    const response = await getOpenAI().images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high'
    });

    // Get the image URL from response
    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Fetch the image and convert to buffer
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    // If gpt-image-1 fails, try with dall-e-3 as fallback
    console.log('Trying DALL-E 3 as fallback...');
    const response = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    });

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error('No image data in fallback response');
    }

    return Buffer.from(base64, 'base64');
  }
}

/**
 * Process a single image generation job
 * Returns true if a job was processed, false if no jobs available
 */
export async function processImageGenerationJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`Processing job ${job.id} for exercise ${job.exerciseId} (attempt ${job.attempts})`);

  try {
    // Get exercise details
    const exercise = await getExerciseById(job.exerciseId);

    if (!exercise) {
      await failJob(job.id, 'Exercise not found');
      return true;
    }

    console.log(`Generating images for: ${exercise.name}`);

    // Step 1: Get exercise information via web search
    const exerciseInfo = await getExerciseInfo(exercise.name, exercise.formCues);
    console.log(`Got exercise info for: ${exercise.name}`);

    // Step 2: Generate and save both images
    for (const imageIndex of [1, 2] as const) {
      // Atomically claim this image index for generation.
      // If a row already exists (either complete or in-progress), this will do nothing.
      const claimResult = await query(
        `INSERT INTO exercise_images (exercise_id, image_index, storage_path, generation_status, style_prompt)
         VALUES ($1, $2, '', 'generating', $3)
         ON CONFLICT (exercise_id, image_index) DO NOTHING
         RETURNING id`,
        [job.exerciseId, imageIndex, STYLE_PROMPT]
      );

      if (claimResult.rows.length === 0) {
        // Row already exists - check if it's complete or still in progress
        const existing = await query(
          `SELECT generation_status FROM exercise_images
           WHERE exercise_id = $1 AND image_index = $2`,
          [job.exerciseId, imageIndex]
        );

        if (existing.rows[0]?.generation_status === 'complete') {
          console.log(`Image ${imageIndex} already complete for ${exercise.name}, skipping`);
        } else {
          console.log(`Image ${imageIndex} already being handled for ${exercise.name}, skipping`);
        }
        continue;
      }

      console.log(`Generating image ${imageIndex} for ${exercise.name}...`);

      // Generate the image
      const imageBuffer = await generateExerciseImage(
        exercise.name,
        exerciseInfo,
        imageIndex
      );

      console.log(`Generated image ${imageIndex} for ${exercise.name}, size: ${imageBuffer.length} bytes`);

      // Save to storage
      const { storagePath, fileSizeBytes } = await saveExerciseImage(
        exercise.normalizedName,
        imageIndex,
        imageBuffer
      );

      console.log(`Saved image ${imageIndex} to ${storagePath}`);

      // Update record as complete
      await upsertExerciseImage(job.exerciseId, imageIndex, {
        storagePath,
        generationStatus: 'complete',
        stylePrompt: STYLE_PROMPT,
        fileSizeBytes,
        width: 1024,
        height: 1024
      });
    }

    await completeJob(job.id);
    console.log(`Completed job ${job.id} for ${exercise.name}`);
    return true;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Job ${job.id} failed:`, message);
    await failJob(job.id, message);

    // Mark any generating images as failed
    await query(
      `UPDATE exercise_images
       SET generation_status = 'failed', updated_at = NOW()
       WHERE exercise_id = $1 AND generation_status = 'generating'`,
      [job.exerciseId]
    );

    return true;
  }
}

/**
 * Process multiple jobs (batch processing)
 * Returns the number of jobs processed
 */
export async function processBatchJobs(maxJobs: number = 5): Promise<number> {
  let processed = 0;

  for (let i = 0; i < maxJobs; i++) {
    const hasJob = await processImageGenerationJob();
    if (!hasJob) break;
    processed++;
  }

  return processed;
}

/**
 * Worker loop for continuous processing
 * Run this as a background process
 */
export async function runImageGenerationWorker(
  pollIntervalMs: number = 5000
): Promise<never> {
  console.log('Image generation worker started');

  while (true) {
    try {
      const processed = await processImageGenerationJob();

      if (!processed) {
        // No jobs available, wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    } catch (error) {
      console.error('Worker error:', error);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }
}

/**
 * Generate images for a single exercise (for testing/manual triggering)
 */
export async function generateImagesForExercise(exerciseId: number): Promise<void> {
  const exercise = await getExerciseById(exerciseId);
  if (!exercise) {
    throw new Error(`Exercise ${exerciseId} not found`);
  }

  console.log(`Generating images for: ${exercise.name}`);

  const exerciseInfo = await getExerciseInfo(exercise.name, exercise.formCues);

  for (const imageIndex of [1, 2] as const) {
    await upsertExerciseImage(exerciseId, imageIndex, {
      storagePath: '',
      generationStatus: 'generating',
      stylePrompt: STYLE_PROMPT
    });

    const imageBuffer = await generateExerciseImage(
      exercise.name,
      exerciseInfo,
      imageIndex
    );

    const { storagePath, fileSizeBytes } = await saveExerciseImage(
      exercise.normalizedName,
      imageIndex,
      imageBuffer
    );

    await upsertExerciseImage(exerciseId, imageIndex, {
      storagePath,
      generationStatus: 'complete',
      stylePrompt: STYLE_PROMPT,
      fileSizeBytes,
      width: 1024,
      height: 1024
    });

    console.log(`Generated and saved image ${imageIndex} for ${exercise.name}`);
  }
}
