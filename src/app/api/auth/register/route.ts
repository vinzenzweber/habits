import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { structuredWorkouts, DAY_ORDER } from "@/lib/workoutPlan";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || password.length < 8) {
      return Response.json({ error: "Invalid input. Password must be at least 8 characters." }, { status: 400 });
    }

    // Check if user exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(`
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [email, name || email.split('@')[0], passwordHash]);

    const userId = result.rows[0].id;

    // Copy default workouts for new user
    for (const slug of DAY_ORDER) {
      const workout = structuredWorkouts[slug];
      await query(`
        INSERT INTO workouts (user_id, slug, version, title, focus, description, workout_json, is_active)
        VALUES ($1, $2, 1, $3, $4, $5, $6, true)
      `, [userId, slug, workout.title, workout.focus, workout.description, JSON.stringify(workout)]);
    }

    return Response.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
