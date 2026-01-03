import bcrypt from "bcryptjs";
import { query, transaction } from "@/lib/db";
import { structuredWorkouts, DAY_ORDER } from "@/lib/workoutPlan";

export const runtime = 'nodejs';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate email format
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return Response.json({ error: "Password must be 8-128 characters" }, { status: 400 });
    }

    // Check if user exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and workouts in a transaction
    const userId = await transaction(async (client) => {
      // Create user
      const result = await client.query<{ id: number }>(`
        INSERT INTO users (email, name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [email, name || email.split('@')[0], passwordHash]);

      const newUserId = result.rows[0].id;

      // Copy default workouts for new user
      for (const slug of DAY_ORDER) {
        const workout = structuredWorkouts[slug];
        await client.query(`
          INSERT INTO workouts (user_id, slug, version, title, focus, description, workout_json, is_active)
          VALUES ($1, $2, 1, $3, $4, $5, $6, true)
        `, [newUserId, slug, workout.title, workout.focus, workout.description, JSON.stringify(workout)]);
      }

      return newUserId;
    });

    return Response.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
