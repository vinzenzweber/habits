import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  isValidTimezone,
  isValidLocale,
  isValidUnitSystem,
  type UserPreferences,
  type UnitSystem,
} from "@/lib/user-preferences";

export const runtime = 'nodejs';

/**
 * GET /api/user/preferences
 * Returns the current user's preferences
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query<{ timezone: string; locale: string; unit_system: string }>(
      `SELECT timezone, locale, unit_system FROM users WHERE id = $1`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const preferences: UserPreferences = {
      timezone: row.timezone ?? 'UTC',
      locale: row.locale ?? 'en-US',
      unitSystem: (row.unit_system as UnitSystem) ?? 'metric',
    };

    return Response.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return Response.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 * Updates the current user's preferences
 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { timezone, locale, unitSystem } = body;

    // Validate all fields
    const errors: string[] = [];

    if (timezone !== undefined && !isValidTimezone(timezone)) {
      errors.push("Invalid timezone");
    }

    if (locale !== undefined && !isValidLocale(locale)) {
      errors.push("Invalid locale format");
    }

    if (unitSystem !== undefined && !isValidUnitSystem(unitSystem)) {
      errors.push("Invalid unit system (must be 'metric' or 'imperial')");
    }

    if (errors.length > 0) {
      return Response.json({ error: errors.join(", ") }, { status: 400 });
    }

    // Build the update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (timezone !== undefined) {
      updates.push(`timezone = $${paramIndex}`);
      values.push(timezone);
      paramIndex++;
    }

    if (locale !== undefined) {
      updates.push(`locale = $${paramIndex}`);
      values.push(locale);
      paramIndex++;
    }

    if (unitSystem !== undefined) {
      updates.push(`unit_system = $${paramIndex}`);
      values.push(unitSystem);
      paramIndex++;
    }

    if (updates.length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Add user ID as the last parameter
    values.push(session.user.id);

    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    );

    // Fetch and return the updated preferences
    const result = await query<{ timezone: string; locale: string; unit_system: string }>(
      `SELECT timezone, locale, unit_system FROM users WHERE id = $1`,
      [session.user.id]
    );

    const row = result.rows[0];
    const updatedPreferences: UserPreferences = {
      timezone: row.timezone ?? 'UTC',
      locale: row.locale ?? 'en-US',
      unitSystem: (row.unit_system as UnitSystem) ?? 'metric',
    };

    return Response.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return Response.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
