import { query } from './db';

export interface Exercise {
  id: number;
  name: string;
  normalizedName: string;
  description?: string;
  formCues?: string;
  muscleGroups: string[];
  equipment: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseImage {
  id: number;
  exerciseId: number;
  imageIndex: 1 | 2;
  storagePath: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
  referenceUrls?: string[];
  fileSizeBytes?: number;
  width?: number;
  height?: number;
}

export interface ExerciseWithImages extends Exercise {
  images: ExerciseImage[];
}

export interface ExerciseSearchResult {
  id: number;
  name: string;
  formCues?: string;
  muscleGroups: string[];
  equipment: string[];
  category?: string;
  imageStatus: 'complete' | 'partial' | 'pending' | 'none';
  completeImageCount: number;
}

export type ExerciseCategory = 'warmup' | 'main' | 'hiit' | 'recovery';

const MAX_EXERCISE_NAME_LENGTH = 255;

/**
 * Normalize exercise name for consistent lookup
 * Converts to lowercase, removes special chars, replaces spaces with hyphens
 */
export function normalizeExerciseName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  // Enforce database VARCHAR(255) limit
  if (normalized.length > MAX_EXERCISE_NAME_LENGTH) {
    return normalized.substring(0, MAX_EXERCISE_NAME_LENGTH);
  }

  return normalized;
}

/**
 * Validate exercise name length
 */
export function validateExerciseName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Exercise name is required' };
  }
  if (name.length > MAX_EXERCISE_NAME_LENGTH) {
    return { valid: false, error: `Exercise name must be ${MAX_EXERCISE_NAME_LENGTH} characters or less` };
  }
  return { valid: true };
}

/**
 * Search exercises in the library using full-text search
 */
export async function searchExercises(
  searchQuery: string,
  category?: ExerciseCategory,
  limit: number = 10
): Promise<ExerciseSearchResult[]> {
  // Build the search query
  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0)
    .map(term => `${term}:*`)
    .join(' & ');

  let sql = `
    SELECT
      e.id,
      e.name,
      e.form_cues,
      e.muscle_groups,
      e.equipment,
      e.category,
      COUNT(CASE WHEN ei.generation_status = 'complete' THEN 1 END) as complete_count,
      COUNT(ei.id) as total_images
    FROM exercises e
    LEFT JOIN exercise_images ei ON e.id = ei.exercise_id
    WHERE 1=1
  `;

  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (searchTerms) {
    sql += ` AND to_tsvector('english', e.name || ' ' || COALESCE(e.form_cues, '')) @@ to_tsquery('english', $${paramIndex})`;
    params.push(searchTerms);
    paramIndex++;
  }

  if (category) {
    sql += ` AND e.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  sql += `
    GROUP BY e.id
    ORDER BY
      COUNT(CASE WHEN ei.generation_status = 'complete' THEN 1 END) DESC,
      e.name ASC
    LIMIT $${paramIndex}
  `;
  params.push(limit);

  const result = await query(sql, params);

  return result.rows.map(row => {
    const completeCount = parseInt(row.complete_count) || 0;
    const totalImages = parseInt(row.total_images) || 0;

    let imageStatus: ExerciseSearchResult['imageStatus'];
    if (completeCount >= 2) {
      imageStatus = 'complete';
    } else if (completeCount > 0) {
      imageStatus = 'partial';
    } else if (totalImages > 0) {
      imageStatus = 'pending';
    } else {
      imageStatus = 'none';
    }

    return {
      id: row.id,
      name: row.name,
      formCues: row.form_cues,
      muscleGroups: row.muscle_groups || [],
      equipment: row.equipment || [],
      category: row.category,
      imageStatus,
      completeImageCount: completeCount
    };
  });
}

/**
 * Get or create an exercise in the global library
 */
export async function getOrCreateExercise(
  name: string,
  formCues?: string,
  muscleGroups?: string[],
  equipment?: string[],
  category?: ExerciseCategory
): Promise<Exercise> {
  const normalizedName = normalizeExerciseName(name);

  // Try to get existing exercise
  let result = await query(
    `SELECT id, name, normalized_name, description, form_cues, muscle_groups, equipment, category, created_at, updated_at
     FROM exercises WHERE normalized_name = $1`,
    [normalizedName]
  );

  if (result.rows.length === 0) {
    // Create new exercise
    result = await query(
      `INSERT INTO exercises (name, normalized_name, form_cues, muscle_groups, equipment, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, normalized_name, description, form_cues, muscle_groups, equipment, category, created_at, updated_at`,
      [name, normalizedName, formCues || null, muscleGroups || null, equipment || null, category || null]
    );
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    description: row.description,
    formCues: row.form_cues,
    muscleGroups: row.muscle_groups || [],
    equipment: row.equipment || [],
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get exercise by name with images
 */
export async function getExerciseWithImages(name: string): Promise<ExerciseWithImages | null> {
  const normalizedName = normalizeExerciseName(name);

  const result = await query(
    `SELECT
      e.id, e.name, e.normalized_name, e.description, e.form_cues,
      e.muscle_groups, e.equipment, e.category, e.created_at, e.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ei.id,
            'exerciseId', ei.exercise_id,
            'imageIndex', ei.image_index,
            'storagePath', ei.storage_path,
            'generationStatus', ei.generation_status,
            'referenceUrls', ei.reference_urls,
            'fileSizeBytes', ei.file_size_bytes,
            'width', ei.width,
            'height', ei.height
          ) ORDER BY ei.image_index
        ) FILTER (WHERE ei.id IS NOT NULL),
        '[]'
      ) as images
    FROM exercises e
    LEFT JOIN exercise_images ei ON e.id = ei.exercise_id
    WHERE e.normalized_name = $1
    GROUP BY e.id`,
    [normalizedName]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    description: row.description,
    formCues: row.form_cues,
    muscleGroups: row.muscle_groups || [],
    equipment: row.equipment || [],
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: row.images || []
  };
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(id: number): Promise<Exercise | null> {
  const result = await query(
    `SELECT id, name, normalized_name, description, form_cues, muscle_groups, equipment, category, created_at, updated_at
     FROM exercises WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    description: row.description,
    formCues: row.form_cues,
    muscleGroups: row.muscle_groups || [],
    equipment: row.equipment || [],
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Batch lookup image status for multiple exercises
 */
export async function getExerciseImageStatuses(
  exerciseNames: string[]
): Promise<Map<string, { imageUrl1?: string; imageUrl2?: string; status: 'complete' | 'partial' | 'pending' | 'generating' | 'failed' | 'none' }>> {
  if (exerciseNames.length === 0) {
    return new Map();
  }

  const normalizedNames = exerciseNames.map(normalizeExerciseName);

  const result = await query(
    `SELECT
      e.name,
      e.normalized_name,
      ei.image_index,
      ei.storage_path,
      ei.generation_status
    FROM exercises e
    LEFT JOIN exercise_images ei ON e.id = ei.exercise_id
    WHERE e.normalized_name = ANY($1)
    ORDER BY e.normalized_name, ei.image_index`,
    [normalizedNames]
  );

  const statusMap = new Map<string, { imageUrl1?: string; imageUrl2?: string; status: 'complete' | 'partial' | 'pending' | 'generating' | 'failed' | 'none' }>();

  // Initialize with 'none' for all requested exercises
  for (const name of exerciseNames) {
    statusMap.set(name, { status: 'none' });
  }

  // Group by exercise name
  const exerciseImages = new Map<string, { images: Array<{ index: number; path: string; status: string }> }>();

  for (const row of result.rows) {
    const name = row.name;
    if (!exerciseImages.has(name)) {
      exerciseImages.set(name, { images: [] });
    }
    if (row.image_index) {
      exerciseImages.get(name)!.images.push({
        index: row.image_index,
        path: row.storage_path,
        status: row.generation_status
      });
    }
  }

  // Calculate status for each exercise
  for (const [name, data] of exerciseImages) {
    const completeImages = data.images.filter(img => img.status === 'complete');
    const generatingImages = data.images.filter(img => img.status === 'generating');
    const failedImages = data.images.filter(img => img.status === 'failed');

    let status: 'complete' | 'partial' | 'pending' | 'generating' | 'failed' | 'none';
    if (completeImages.length >= 2) {
      status = 'complete';
    } else if (completeImages.length > 0) {
      status = 'partial';
    } else if (generatingImages.length > 0) {
      status = 'generating';
    } else if (failedImages.length > 0 && data.images.length === failedImages.length) {
      status = 'failed';
    } else if (data.images.length > 0) {
      status = 'pending';
    } else {
      status = 'none';
    }

    const entry: { imageUrl1?: string; imageUrl2?: string; status: typeof status } = { status };

    const image1 = completeImages.find(img => img.index === 1);
    const image2 = completeImages.find(img => img.index === 2);

    if (image1) {
      entry.imageUrl1 = `/api/exercises/${encodeURIComponent(name)}/images/1`;
    }
    if (image2) {
      entry.imageUrl2 = `/api/exercises/${encodeURIComponent(name)}/images/2`;
    }

    statusMap.set(name, entry);
  }

  return statusMap;
}

/**
 * Check if exercise has both images complete
 */
export async function hasCompleteImages(exerciseId: number): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as count FROM exercise_images
     WHERE exercise_id = $1 AND generation_status = 'complete'`,
    [exerciseId]
  );

  return parseInt(result.rows[0].count) >= 2;
}

/**
 * Update exercise image record
 */
export async function updateExerciseImage(
  exerciseId: number,
  imageIndex: 1 | 2,
  updates: {
    storagePath?: string;
    generationStatus?: 'pending' | 'generating' | 'complete' | 'failed';
    referenceUrls?: string[];
    stylePrompt?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
  }
): Promise<void> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: (string | number | string[] | null)[] = [];
  let paramIndex = 1;

  if (updates.storagePath !== undefined) {
    setClauses.push(`storage_path = $${paramIndex++}`);
    params.push(updates.storagePath);
  }
  if (updates.generationStatus !== undefined) {
    setClauses.push(`generation_status = $${paramIndex++}`);
    params.push(updates.generationStatus);
  }
  if (updates.referenceUrls !== undefined) {
    setClauses.push(`reference_urls = $${paramIndex++}`);
    params.push(updates.referenceUrls);
  }
  if (updates.stylePrompt !== undefined) {
    setClauses.push(`style_prompt = $${paramIndex++}`);
    params.push(updates.stylePrompt);
  }
  if (updates.fileSizeBytes !== undefined) {
    setClauses.push(`file_size_bytes = $${paramIndex++}`);
    params.push(updates.fileSizeBytes);
  }
  if (updates.width !== undefined) {
    setClauses.push(`width = $${paramIndex++}`);
    params.push(updates.width);
  }
  if (updates.height !== undefined) {
    setClauses.push(`height = $${paramIndex++}`);
    params.push(updates.height);
  }

  params.push(exerciseId, imageIndex);

  await query(
    `UPDATE exercise_images
     SET ${setClauses.join(', ')}
     WHERE exercise_id = $${paramIndex++} AND image_index = $${paramIndex}`,
    params
  );
}

/**
 * Create or update exercise image record
 */
export async function upsertExerciseImage(
  exerciseId: number,
  imageIndex: 1 | 2,
  data: {
    storagePath: string;
    generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
    referenceUrls?: string[];
    stylePrompt?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
  }
): Promise<void> {
  await query(
    `INSERT INTO exercise_images
     (exercise_id, image_index, storage_path, generation_status, reference_urls, style_prompt, file_size_bytes, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (exercise_id, image_index)
     DO UPDATE SET
       storage_path = EXCLUDED.storage_path,
       generation_status = EXCLUDED.generation_status,
       reference_urls = EXCLUDED.reference_urls,
       style_prompt = EXCLUDED.style_prompt,
       file_size_bytes = EXCLUDED.file_size_bytes,
       width = EXCLUDED.width,
       height = EXCLUDED.height,
       updated_at = NOW()`,
    [
      exerciseId,
      imageIndex,
      data.storagePath,
      data.generationStatus,
      data.referenceUrls || null,
      data.stylePrompt || null,
      data.fileSizeBytes || null,
      data.width || null,
      data.height || null
    ]
  );
}

/**
 * Batch check which exercises have at least one complete image ready
 * Returns a Set of normalized exercise names that have at least one complete image
 * This is used to prevent 400 errors from Next.js Image optimizer when images don't exist
 */
export async function getExercisesWithCompleteImages(
  exerciseNames: string[]
): Promise<Set<string>> {
  if (exerciseNames.length === 0) {
    return new Set();
  }

  const normalizedNames = exerciseNames.map(normalizeExerciseName);

  const result = await query(
    `SELECT DISTINCT e.normalized_name
     FROM exercises e
     INNER JOIN exercise_images ei ON e.id = ei.exercise_id
     WHERE e.normalized_name = ANY($1)
       AND ei.generation_status = 'complete'`,
    [normalizedNames]
  );

  return new Set(result.rows.map(row => row.normalized_name));
}

/**
 * Batch lookup exercise descriptions (form cues) by name
 * Returns a Map of exercise name -> form cues (description)
 * Used for building workouts with database-driven exercise descriptions
 */
export async function getExerciseDescriptions(
  exerciseNames: string[]
): Promise<Map<string, string>> {
  if (exerciseNames.length === 0) {
    return new Map();
  }

  const normalizedNames = exerciseNames.map(normalizeExerciseName);

  const result = await query(
    `SELECT name, form_cues
     FROM exercises
     WHERE normalized_name = ANY($1)
       AND form_cues IS NOT NULL`,
    [normalizedNames]
  );

  const descriptionMap = new Map<string, string>();

  for (const row of result.rows) {
    descriptionMap.set(row.name, row.form_cues);
  }

  return descriptionMap;
}

/**
 * Get all exercises (for seeding/admin)
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const result = await query(
    `SELECT id, name, normalized_name, description, form_cues, muscle_groups, equipment, category, created_at, updated_at
     FROM exercises
     ORDER BY name`
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    description: row.description,
    formCues: row.form_cues,
    muscleGroups: row.muscle_groups || [],
    equipment: row.equipment || [],
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Update an exercise's description (form cues)
 */
export async function updateExerciseDescription(
  exerciseId: number,
  formCues: string
): Promise<Exercise | null> {
  const result = await query(
    `UPDATE exercises
     SET form_cues = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, normalized_name, description, form_cues, muscle_groups, equipment, category, created_at, updated_at`,
    [formCues, exerciseId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    description: row.description,
    formCues: row.form_cues,
    muscleGroups: row.muscle_groups || [],
    equipment: row.equipment || [],
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get all exercises with descriptions for admin management
 * Returns exercises sorted by name with hasDescription flag
 */
export async function getAllExercisesForManagement(): Promise<Array<{
  id: number;
  name: string;
  formCues: string | null;
  hasDescription: boolean;
  category: string | null;
  updatedAt: Date;
}>> {
  const result = await query(
    `SELECT id, name, form_cues, category, updated_at
     FROM exercises
     ORDER BY name`
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    formCues: row.form_cues,
    hasDescription: !!row.form_cues && row.form_cues.trim().length > 0,
    category: row.category,
    updatedAt: row.updated_at
  }));
}
