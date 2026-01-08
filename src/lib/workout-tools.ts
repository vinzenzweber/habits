import { query } from "./db";

interface CompletionRecord {
  id: number;
  workout_title: string;
  workout_slug: string;
  completed_at: string;
  duration_seconds: number;
  difficulty_rating: 'too_easy' | 'just_right' | 'too_hard' | null;
}

interface WorkoutStats {
  // Recent activity
  recentCompletions: CompletionRecord[];

  // Counts
  totalCompletions: number;
  completionsLast7Days: number;
  completionsLast30Days: number;
  completionsThisWeek: number; // Current calendar week (Mon-Sun)

  // Streaks
  currentStreak: number; // Consecutive days with at least one workout
  longestStreak: number;

  // Averages
  averageWorkoutsPerWeek: number; // Over last 4 weeks
  averageDurationMinutes: number;

  // Patterns
  workoutsByDayOfWeek: Record<string, number>; // e.g., { monday: 5, tuesday: 3, ... }
  mostActiveDays: string[]; // Top 3 days

  // Difficulty feedback
  difficultyBreakdown: {
    too_easy: number;
    just_right: number;
    too_hard: number;
    no_rating: number;
  };

  // Time-based insights
  firstWorkoutDate: string | null;
  lastWorkoutDate: string | null;
  daysSinceLastWorkout: number | null;
}

interface CompletionRow {
  id: number;
  completed_at: string;
  duration_seconds: number;
  difficulty_rating: 'too_easy' | 'just_right' | 'too_hard' | null;
  workout_slug: string;
  workout_title: string;
}

export async function getWorkoutStatsTool(userId: string): Promise<WorkoutStats> {
  // Get all completions for this user
  const completionsResult = await query(`
    SELECT
      wc.id,
      wc.completed_at,
      wc.duration_seconds,
      wc.difficulty_rating,
      w.slug as workout_slug,
      (wc.workout_snapshot->>'title') as workout_title
    FROM workout_completions wc
    JOIN workouts w ON wc.workout_id = w.id
    WHERE wc.user_id = $1
    ORDER BY wc.completed_at DESC
  `, [userId]);

  const completions = completionsResult.rows as CompletionRow[];
  const now = new Date();

  // Recent completions (last 10)
  const recentCompletions: CompletionRecord[] = completions.slice(0, 10).map(c => ({
    id: c.id,
    workout_title: c.workout_title,
    workout_slug: c.workout_slug,
    completed_at: c.completed_at,
    duration_seconds: c.duration_seconds,
    difficulty_rating: c.difficulty_rating
  }));

  // Total completions
  const totalCompletions = completions.length;

  // Time-based counts
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get start of current week (Monday)
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const completionsLast7Days = completions.filter(c =>
    new Date(c.completed_at) >= sevenDaysAgo
  ).length;

  const completionsLast30Days = completions.filter(c =>
    new Date(c.completed_at) >= thirtyDaysAgo
  ).length;

  const completionsThisWeek = completions.filter(c =>
    new Date(c.completed_at) >= startOfWeek
  ).length;

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(completions);

  // Average workouts per week (last 4 weeks)
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const completionsLast4Weeks = completions.filter(c =>
    new Date(c.completed_at) >= fourWeeksAgo
  ).length;
  const averageWorkoutsPerWeek = Math.round((completionsLast4Weeks / 4) * 10) / 10;

  // Average duration
  const totalDuration = completions.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const averageDurationMinutes = completions.length > 0
    ? Math.round(totalDuration / completions.length / 60)
    : 0;

  // Workouts by day of week
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const workoutsByDayOfWeek: Record<string, number> = {
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
    friday: 0, saturday: 0, sunday: 0
  };

  completions.forEach(c => {
    const day = dayNames[new Date(c.completed_at).getDay()];
    workoutsByDayOfWeek[day]++;
  });

  // Most active days (top 3)
  const mostActiveDays = Object.entries(workoutsByDayOfWeek)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .slice(0, 3)
    .map(([day]) => day);

  // Difficulty breakdown
  const difficultyBreakdown = {
    too_easy: completions.filter(c => c.difficulty_rating === 'too_easy').length,
    just_right: completions.filter(c => c.difficulty_rating === 'just_right').length,
    too_hard: completions.filter(c => c.difficulty_rating === 'too_hard').length,
    no_rating: completions.filter(c => !c.difficulty_rating).length
  };

  // First and last workout dates
  const firstWorkoutDate = completions.length > 0
    ? completions[completions.length - 1].completed_at
    : null;
  const lastWorkoutDate = completions.length > 0
    ? completions[0].completed_at
    : null;

  // Days since last workout
  let daysSinceLastWorkout: number | null = null;
  if (lastWorkoutDate) {
    const lastDate = new Date(lastWorkoutDate);
    const diffTime = now.getTime() - lastDate.getTime();
    daysSinceLastWorkout = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    recentCompletions,
    totalCompletions,
    completionsLast7Days,
    completionsLast30Days,
    completionsThisWeek,
    currentStreak,
    longestStreak,
    averageWorkoutsPerWeek,
    averageDurationMinutes,
    workoutsByDayOfWeek,
    mostActiveDays,
    difficultyBreakdown,
    firstWorkoutDate,
    lastWorkoutDate,
    daysSinceLastWorkout
  };
}

function calculateStreaks(completions: Array<{ completed_at: string }>): { currentStreak: number; longestStreak: number } {
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Get unique dates (normalized to day only)
  const uniqueDates = [...new Set(
    completions.map(c => {
      const date = new Date(c.completed_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    })
  )].sort().reverse(); // Most recent first

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate current streak (must include today or yesterday)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  let currentStreak = 0;
  if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
    currentStreak = 1;
    const checkDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

      if (uniqueDates[i] === checkStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  // Sort dates ascending for longest streak calculation
  const sortedDates = [...uniqueDates].sort();

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);

    // Check if consecutive days
    prevDate.setDate(prevDate.getDate() + 1);
    const prevNextStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;

    if (sortedDates[i] === prevNextStr) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { currentStreak, longestStreak };
}

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

export interface WorkoutInput {
  title: string;
  segments: Array<{
    id: string;
    title: string;
    durationSeconds: number;
    category: string;
    detail?: string;
    round?: string;
  }>;
  focus?: string;
  description?: string;
}

export interface WorkoutValidationWarning {
  type: 'phase_order' | 'missing_rounds' | 'missing_rest' | 'single_main_exercise';
  message: string;
}

// Valid category order for workouts
const CATEGORY_ORDER = ['prep', 'warmup', 'main', 'hiit', 'recovery'];

// Exported for testing
export function validateWorkoutStructure(workout: WorkoutInput): WorkoutValidationWarning[] {
  const warnings: WorkoutValidationWarning[] = [];
  const segments = workout.segments;

  if (!segments || segments.length === 0) {
    return warnings;
  }

  // Check phase order - categories should follow the expected order
  let lastCategoryIndex = -1;
  for (const segment of segments) {
    // Skip rest segments when checking order
    if (segment.category === 'rest') continue;

    const categoryIndex = CATEGORY_ORDER.indexOf(segment.category);
    if (categoryIndex !== -1 && categoryIndex < lastCategoryIndex) {
      warnings.push({
        type: 'phase_order',
        message: `Category "${segment.category}" appears after "${CATEGORY_ORDER[lastCategoryIndex]}" - expected order: prep → warmup → main → hiit → recovery`
      });
      break; // Only report first order violation
    }
    if (categoryIndex !== -1) {
      lastCategoryIndex = categoryIndex;
    }
  }

  // Check main exercises have rounds
  const mainSegments = segments.filter(s => s.category === 'main' && s.title !== 'Rest');
  if (mainSegments.length > 0) {
    // Get unique exercise titles
    const uniqueMainExercises = [...new Set(mainSegments.map(s => s.title))];

    // Count occurrences of each exercise
    const exerciseCounts: Record<string, number> = {};
    for (const segment of mainSegments) {
      exerciseCounts[segment.title] = (exerciseCounts[segment.title] || 0) + 1;
    }

    // Check if exercises appear multiple times (indicating rounds)
    const singleOccurrenceExercises = uniqueMainExercises.filter(
      title => exerciseCounts[title] === 1
    );

    if (singleOccurrenceExercises.length > 0 && uniqueMainExercises.length > 1) {
      // If there are multiple unique main exercises but some only appear once,
      // the workout might be missing rounds
      const hasRoundIndicators = mainSegments.some(s => s.round && s.round.includes('of'));
      if (!hasRoundIndicators) {
        warnings.push({
          type: 'missing_rounds',
          message: `Main exercises should be repeated for multiple rounds. Found ${uniqueMainExercises.length} exercises that appear only once.`
        });
      }
    }
  }

  // Check for rest segments between main exercise groups
  const mainAndRestSegments = segments.filter(s => s.category === 'main' || s.category === 'rest');
  if (mainAndRestSegments.length > 3) {
    // Count consecutive main segments without rest
    let consecutiveMain = 0;
    let maxConsecutive = 0;
    for (const segment of mainAndRestSegments) {
      if (segment.category === 'main') {
        consecutiveMain++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMain);
      } else {
        consecutiveMain = 0;
      }
    }

    // If there are many consecutive main segments without rest, warn
    // Allow up to 6 consecutive (typical for 3 exercises in a round)
    if (maxConsecutive > 8) {
      warnings.push({
        type: 'missing_rest',
        message: `Found ${maxConsecutive} consecutive main exercises without rest. Consider adding rest periods between rounds.`
      });
    }
  }

  return warnings;
}

export async function updateWorkoutTool(userId: string, slug: string, workout: WorkoutInput) {
  // Validate basic structure
  if (!workout.title || !workout.segments || !Array.isArray(workout.segments)) {
    throw new Error("Invalid workout structure");
  }

  // Validate workout structure and log warnings
  const structureWarnings = validateWorkoutStructure(workout);
  if (structureWarnings.length > 0) {
    console.warn(`[Workout Structure Warnings for ${slug}]:`, structureWarnings);
  }

  // Always recalculate totalSeconds from segments (don't trust AI-provided value)
  const totalSeconds = workout.segments.reduce(
    (sum, segment) => sum + (segment.durationSeconds || 0),
    0
  );

  // Update the workout object with correct totalSeconds
  const workoutToSave = {
    ...workout,
    slug,
    totalSeconds
  };

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
    workoutToSave.title,
    workoutToSave.focus || "",
    workoutToSave.description || "",
    JSON.stringify(workoutToSave)
  ]);

  return {
    success: true,
    version: nextVersion,
    structureWarnings: structureWarnings.length > 0 ? structureWarnings : undefined
  };
}
