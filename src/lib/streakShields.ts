import { auth } from "./auth";
import { query } from "./db";
import { NANO_WEEKLY_LIMIT } from "./nanoWorkout";

// Maximum shields a user can stockpile
export const MAX_SHIELD_STOCKPILE = 2;

// Number of consecutive full workouts needed to earn a shield
export const WORKOUTS_PER_SHIELD = 7;

// Rest days allowed per 7-day rolling period
export const REST_DAYS_PER_WEEK = 1;

export type CompletionType = "full" | "nano" | "shield" | "rest";

export interface ShieldStatus {
  available: number;
  totalEarned: number;
  maxStockpile: number;
}

export interface NanoStatus {
  usedThisWeek: number;
  remainingThisWeek: number;
  weeklyLimit: number;
}

export interface RestDayStatus {
  usedLast7Days: number;
  available: boolean;
}

export interface StreakPreservationStatus {
  shields: ShieldStatus;
  nano: NanoStatus;
  restDay: RestDayStatus;
}

/**
 * Get the start of the current ISO week (Monday)
 */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to get Monday (day 1). If Sunday (0), go back 6 days
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/**
 * Get available streak shields for a user
 */
export async function getAvailableShields(userId: number): Promise<ShieldStatus> {
  const result = await query(
    `
    SELECT
      COUNT(*) FILTER (WHERE used_at IS NULL) as available,
      COUNT(*) as total_earned
    FROM streak_shields
    WHERE user_id = $1
    `,
    [userId]
  );

  const row = result.rows[0];
  return {
    available: parseInt(row?.available ?? "0", 10),
    totalEarned: parseInt(row?.total_earned ?? "0", 10),
    maxStockpile: MAX_SHIELD_STOCKPILE,
  };
}

/**
 * Get nano workout usage for the current week
 */
export async function getNanoUsageThisWeek(userId: number): Promise<NanoStatus> {
  const weekStart = getWeekStart();

  const result = await query(
    `
    SELECT count FROM nano_workout_usage
    WHERE user_id = $1 AND week_start = $2
    `,
    [userId, weekStart]
  );

  const usedThisWeek = parseInt(result.rows[0]?.count ?? "0", 10);

  return {
    usedThisWeek,
    remainingThisWeek: Math.max(0, NANO_WEEKLY_LIMIT - usedThisWeek),
    weeklyLimit: NANO_WEEKLY_LIMIT,
  };
}

/**
 * Check if user can do a nano workout this week
 */
export async function canDoNanoWorkout(userId: number): Promise<boolean> {
  const status = await getNanoUsageThisWeek(userId);
  return status.remainingThisWeek > 0;
}

/**
 * Increment nano workout usage for the current week
 */
export async function recordNanoWorkoutUsage(userId: number): Promise<void> {
  const weekStart = getWeekStart();

  await query(
    `
    INSERT INTO nano_workout_usage (user_id, week_start, count)
    VALUES ($1, $2, 1)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET count = nano_workout_usage.count + 1, updated_at = NOW()
    `,
    [userId, weekStart]
  );
}

/**
 * Get rest day usage in the last 7 days
 */
export async function getRestDayStatus(userId: number): Promise<RestDayStatus> {
  const result = await query(
    `
    SELECT COUNT(*) as used
    FROM rest_day_usage
    WHERE user_id = $1
    AND rest_date >= CURRENT_DATE - INTERVAL '6 days'
    `,
    [userId]
  );

  const usedLast7Days = parseInt(result.rows[0]?.used ?? "0", 10);

  return {
    usedLast7Days,
    available: usedLast7Days < REST_DAYS_PER_WEEK,
  };
}

/**
 * Record a rest day (mark today as a rest day)
 */
export async function recordRestDay(userId: number, date?: Date): Promise<boolean> {
  const status = await getRestDayStatus(userId);
  if (!status.available) {
    return false;
  }

  const restDate = date
    ? date.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  await query(
    `
    INSERT INTO rest_day_usage (user_id, rest_date)
    VALUES ($1, $2)
    ON CONFLICT (user_id, rest_date) DO NOTHING
    `,
    [userId, restDate]
  );

  return true;
}

/**
 * Earn a streak shield (called after completing full workouts)
 * Only earns if user hasn't reached max stockpile
 */
export async function earnShield(
  userId: number,
  streakLength: number
): Promise<boolean> {
  // Check current stockpile
  const status = await getAvailableShields(userId);
  if (status.available >= MAX_SHIELD_STOCKPILE) {
    return false; // Already at max
  }

  await query(
    `
    INSERT INTO streak_shields (user_id, earned_from_streak)
    VALUES ($1, $2)
    `,
    [userId, streakLength]
  );

  return true;
}

/**
 * Apply a streak shield to cover a missed day
 * Returns the shield ID if successful, null if no shields available
 */
export async function applyShield(
  userId: number,
  forDate?: Date
): Promise<number | null> {
  const status = await getAvailableShields(userId);
  if (status.available === 0) {
    return null;
  }

  // Use the oldest available shield (FIFO)
  const result = await query(
    `
    UPDATE streak_shields
    SET used_at = NOW()
    WHERE id = (
      SELECT id FROM streak_shields
      WHERE user_id = $1 AND used_at IS NULL
      ORDER BY earned_at ASC
      LIMIT 1
    )
    RETURNING id
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Create a completion record for the shield
  const shieldDate = forDate
    ? forDate.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  // We need to get a workout_id to insert into workout_completions
  // Use the first active workout for this user as a placeholder
  const workoutResult = await query(
    `
    SELECT id FROM workouts
    WHERE user_id = $1 AND is_active = true
    LIMIT 1
    `,
    [userId]
  );

  if (workoutResult.rows.length > 0) {
    const workoutId = workoutResult.rows[0].id;

    await query(
      `
      INSERT INTO workout_completions (
        user_id, workout_id, completed_at, workout_snapshot, duration_seconds, completion_type
      )
      VALUES ($1, $2, $3::date, '{"type": "shield"}'::jsonb, 0, 'shield')
      `,
      [userId, workoutId, shieldDate]
    );
  }

  return result.rows[0].id;
}

/**
 * Check if auto-shield should be applied for yesterday
 * Called on app open to preserve streak
 */
export async function checkAndAutoApplyShield(userId: number): Promise<{
  applied: boolean;
  shieldId?: number;
}> {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Check if there was any completion yesterday
  const completionResult = await query(
    `
    SELECT id FROM workout_completions
    WHERE user_id = $1
    AND DATE(completed_at) = $2::date
    LIMIT 1
    `,
    [userId, yesterdayStr]
  );

  if (completionResult.rows.length > 0) {
    // Already have a completion for yesterday, no shield needed
    return { applied: false };
  }

  // Check if there's an active streak that would break
  // (had a workout 2 days ago)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

  const streakResult = await query(
    `
    SELECT id FROM workout_completions
    WHERE user_id = $1
    AND DATE(completed_at) = $2::date
    LIMIT 1
    `,
    [userId, twoDaysAgoStr]
  );

  if (streakResult.rows.length === 0) {
    // No workout 2 days ago, streak is already broken
    return { applied: false };
  }

  // Try to apply shield
  const shieldId = await applyShield(userId, yesterday);

  if (shieldId) {
    return { applied: true, shieldId };
  }

  return { applied: false };
}

/**
 * Check if a shield should be earned after a workout
 * Based on consecutive FULL workouts (nano doesn't count toward earning)
 */
export async function checkAndEarnShield(userId: number): Promise<{
  earned: boolean;
  streakLength?: number;
}> {
  // Count consecutive full workouts (not nano, not shield)
  const result = await query(
    `
    WITH recent_completions AS (
      SELECT
        DATE(completed_at) as completion_date,
        completion_type
      FROM workout_completions
      WHERE user_id = $1
      ORDER BY completed_at DESC
      LIMIT 30
    ),
    consecutive AS (
      SELECT
        completion_date,
        completion_type,
        ROW_NUMBER() OVER (ORDER BY completion_date DESC) as rn
      FROM recent_completions
      WHERE completion_type = 'full'
    )
    SELECT COUNT(*) as streak
    FROM consecutive c1
    WHERE NOT EXISTS (
      -- Check for gaps (missing days)
      SELECT 1 FROM consecutive c2
      WHERE c2.rn = c1.rn + 1
      AND c2.completion_date != c1.completion_date - INTERVAL '1 day'
    )
    AND c1.completion_date >= (
      -- Find where the streak starts
      SELECT MAX(completion_date) - INTERVAL '30 days' FROM consecutive
    )
    `,
    [userId]
  );
  // Note: result is intentionally unused - the simpler query below is more reliable
  void result;

  // Simpler approach: count consecutive full workouts from today backwards
  const simpleResult = await query(
    `
    WITH dated_completions AS (
      SELECT DISTINCT DATE(completed_at) as d, completion_type
      FROM workout_completions
      WHERE user_id = $1 AND completion_type = 'full'
      ORDER BY d DESC
    ),
    numbered AS (
      SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d DESC))::int AS grp
      FROM dated_completions
    )
    SELECT COUNT(*) as streak_length
    FROM numbered
    WHERE grp = (SELECT grp FROM numbered ORDER BY d DESC LIMIT 1)
    `,
    [userId]
  );

  const streakLength = parseInt(simpleResult.rows[0]?.streak_length ?? "0", 10);

  // Earn shield every 7 consecutive full workouts
  if (streakLength > 0 && streakLength % WORKOUTS_PER_SHIELD === 0) {
    const earned = await earnShield(userId, streakLength);
    return { earned, streakLength };
  }

  return { earned: false };
}

/**
 * Get full streak preservation status for a user
 */
export async function getStreakPreservationStatus(): Promise<StreakPreservationStatus | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = parseInt(session.user.id, 10);

  const [shields, nano, restDay] = await Promise.all([
    getAvailableShields(userId),
    getNanoUsageThisWeek(userId),
    getRestDayStatus(userId),
  ]);

  return {
    shields,
    nano,
    restDay,
  };
}
