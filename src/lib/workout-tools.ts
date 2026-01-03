import { query } from "./db";

export async function getAllWorkoutsTool(userId: string) {
  const result = await query(`
    SELECT slug, workout_json FROM workouts
    WHERE user_id = $1 AND is_active = true
    ORDER BY CASE slug
      WHEN 'monday' THEN 1
      WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3
      WHEN 'thursday' THEN 4
      WHEN 'friday' THEN 5
      WHEN 'saturday' THEN 6
      WHEN 'sunday' THEN 7
    END
  `, [userId]);

  return result.rows.map(row => row.workout_json);
}

export async function getWorkoutTool(userId: string, slug: string) {
  const result = await query(`
    SELECT workout_json FROM workouts
    WHERE user_id = $1 AND slug = $2 AND is_active = true
  `, [userId, slug]);

  return result.rows[0]?.workout_json || null;
}

export async function updateWorkoutTool(userId: string, slug: string, workout: any) {
  // TODO: Add Zod schema validation here

  // Validate basic structure
  if (!workout.title || !workout.segments || !Array.isArray(workout.segments)) {
    throw new Error("Invalid workout structure");
  }

  // Get current version
  const current = await query(`
    SELECT version FROM workouts
    WHERE user_id = $1 AND slug = $2 AND is_active = true
  `, [userId, slug]);

  const nextVersion = (current.rows[0]?.version || 0) + 1;

  // Deactivate current version
  await query(`
    UPDATE workouts SET is_active = false
    WHERE user_id = $1 AND slug = $2 AND is_active = true
  `, [userId, slug]);

  // Insert new version
  await query(`
    INSERT INTO workouts (user_id, slug, version, title, focus, description, workout_json, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
  `, [
    userId,
    slug,
    nextVersion,
    workout.title,
    workout.focus || "",
    workout.description || "",
    JSON.stringify(workout)
  ]);

  return { success: true, version: nextVersion };
}
