import { auth, unstable_update } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  isValidTimezone,
  isValidLocale,
  isValidUnitSystem,
  isValidRecipeLocale,
  type UserPreferencesWithRecipe,
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
    const result = await query<{
      timezone: string;
      locale: string;
      unit_system: string;
      default_recipe_locale: string | null;
      show_measurement_conversions: boolean;
    }>(
      `SELECT timezone, locale, unit_system, default_recipe_locale, show_measurement_conversions FROM users WHERE id = $1`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const preferences: UserPreferencesWithRecipe = {
      timezone: row.timezone ?? 'UTC',
      locale: row.locale ?? 'en-US',
      unitSystem: (row.unit_system as UnitSystem) ?? 'metric',
      defaultRecipeLocale: row.default_recipe_locale ?? null,
      showMeasurementConversions: row.show_measurement_conversions ?? false,
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
    const { timezone, locale, unitSystem, defaultRecipeLocale, showMeasurementConversions } = body;

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

    if (defaultRecipeLocale !== undefined && !isValidRecipeLocale(defaultRecipeLocale)) {
      errors.push("Invalid default recipe locale format");
    }

    if (showMeasurementConversions !== undefined && typeof showMeasurementConversions !== 'boolean') {
      errors.push("Show measurement conversions must be a boolean");
    }

    if (errors.length > 0) {
      return Response.json({ error: errors.join(", ") }, { status: 400 });
    }

    // Build the update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
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

    if (defaultRecipeLocale !== undefined) {
      // Convert empty string to null for database storage
      updates.push(`default_recipe_locale = $${paramIndex}`);
      values.push(defaultRecipeLocale === '' ? null : defaultRecipeLocale);
      paramIndex++;
    }

    if (showMeasurementConversions !== undefined) {
      updates.push(`show_measurement_conversions = $${paramIndex}`);
      values.push(showMeasurementConversions);
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
    const result = await query<{
      timezone: string;
      locale: string;
      unit_system: string;
      default_recipe_locale: string | null;
      show_measurement_conversions: boolean;
    }>(
      `SELECT timezone, locale, unit_system, default_recipe_locale, show_measurement_conversions FROM users WHERE id = $1`,
      [session.user.id]
    );

    const row = result.rows[0];
    const updatedPreferences: UserPreferencesWithRecipe = {
      timezone: row.timezone ?? 'UTC',
      locale: row.locale ?? 'en-US',
      unitSystem: (row.unit_system as UnitSystem) ?? 'metric',
      defaultRecipeLocale: row.default_recipe_locale ?? null,
      showMeasurementConversions: row.show_measurement_conversions ?? false,
    };

    // Trigger session update with new preferences to refresh the JWT
    // This invokes the JWT callback with trigger='update' and passes preferences in the session parameter
    try {
      await unstable_update({
        user: {
          timezone: updatedPreferences.timezone,
          locale: updatedPreferences.locale,
          unitSystem: updatedPreferences.unitSystem,
          defaultRecipeLocale: updatedPreferences.defaultRecipeLocale,
          showMeasurementConversions: updatedPreferences.showMeasurementConversions,
        },
      });
    } catch (sessionUpdateError) {
      // Log error but don't fail the request - DB update succeeded
      // Session will refresh on next login
      console.error('Error updating session:', sessionUpdateError);
    }

    return Response.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return Response.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
