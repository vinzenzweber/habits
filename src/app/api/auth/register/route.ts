import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

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

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    if (name.trim().length > 255) {
      return Response.json({ error: "Name must be at most 255 characters" }, { status: 400 });
    }

    // Check if user exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (workouts will be generated during onboarding)
    // Note: onboarding_started_at is set separately if the column exists
    const result = await query<{ id: number }>(`
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [email, name.trim(), passwordHash]);

    // Try to set onboarding_started_at if column exists (gracefully handle if not)
    try {
      await query(`UPDATE users SET onboarding_started_at = NOW() WHERE id = $1`, [result.rows[0].id]);
    } catch {
      // Column may not exist yet - that's ok
    }

    const userId = result.rows[0].id;

    return Response.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    // Return more detail for debugging (safe since no sensitive info)
    const message = error instanceof Error ? error.message : "Registration failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
