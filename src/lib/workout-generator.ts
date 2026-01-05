import { query } from "@/lib/db";
import type { StructuredWorkout, RoutineSegment, DaySlug, RoutineSegmentCategory } from "./workoutPlan";

// User profile for workout generation
export interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal: 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance' | 'general_fitness';
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: string[];
  limitations: string[];
}

// Exercise definition
interface Exercise {
  name: string;
  category: RoutineSegmentCategory;
  muscleGroups: string[];
  equipment: string[];
  detail: string;
  durationSeconds: number;
  beginner?: { reps?: string; tempo?: string; duration?: number };
  intermediate?: { reps?: string; tempo?: string; duration?: number };
  advanced?: { reps?: string; tempo?: string; duration?: number };
}

// Day configuration
type DayType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'hiit' | 'recovery';

interface DayConfig {
  slug: DaySlug;
  title: string;
  focus: string;
  description: string;
  muscleGroups: string[];
  type: DayType;
}

const DAY_SLUGS: DaySlug[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Exercise library
const EXERCISE_LIBRARY: Exercise[] = [
  // Warmup exercises
  { name: "Arm circles", category: "warmup", muscleGroups: ["shoulders"], equipment: ["bodyweight"], detail: "Small to big circles both directions", durationSeconds: 30 },
  { name: "Jumping jacks", category: "warmup", muscleGroups: ["full_body"], equipment: ["bodyweight"], detail: "Land softly, arms overhead", durationSeconds: 30 },
  { name: "Inchworms", category: "warmup", muscleGroups: ["core", "hamstrings"], equipment: ["bodyweight"], detail: "Walk hands out to plank, walk back", durationSeconds: 30 },
  { name: "Hip circles", category: "warmup", muscleGroups: ["hips"], equipment: ["bodyweight"], detail: "Slow circles both directions", durationSeconds: 30 },
  { name: "Bodyweight squats", category: "warmup", muscleGroups: ["legs"], equipment: ["bodyweight"], detail: "Sit back, chest up, full depth", durationSeconds: 30 },
  { name: "Leg swings", category: "warmup", muscleGroups: ["hips", "hamstrings"], equipment: ["bodyweight"], detail: "Front-to-back and side-to-side", durationSeconds: 30 },
  { name: "Cat-Cow", category: "warmup", muscleGroups: ["spine"], equipment: ["bodyweight"], detail: "Round and arch with breath", durationSeconds: 30 },
  { name: "World's greatest stretch", category: "warmup", muscleGroups: ["full_body"], equipment: ["bodyweight"], detail: "Lunge, elbow to instep, rotate up", durationSeconds: 45 },

  // Push exercises - Bodyweight
  { name: "Push-ups", category: "main", muscleGroups: ["chest", "shoulders", "triceps"], equipment: ["bodyweight"], detail: "Chest to floor, full extension",
    durationSeconds: 60, beginner: { reps: "8-10 reps" }, intermediate: { reps: "12-15 reps" }, advanced: { reps: "15-20 reps" } },
  { name: "Diamond push-ups", category: "main", muscleGroups: ["triceps", "chest"], equipment: ["bodyweight"], detail: "Hands close together, elbows tight",
    durationSeconds: 60, beginner: { reps: "6-8 reps" }, intermediate: { reps: "10-12 reps" }, advanced: { reps: "15 reps" } },
  { name: "Pike push-ups", category: "main", muscleGroups: ["shoulders", "triceps"], equipment: ["bodyweight"], detail: "Hips high, head towards floor",
    durationSeconds: 60, beginner: { reps: "6-8 reps" }, intermediate: { reps: "10-12 reps" }, advanced: { reps: "15 reps" } },
  { name: "Decline push-ups", category: "main", muscleGroups: ["upper_chest", "shoulders"], equipment: ["bodyweight"], detail: "Feet elevated, chest to floor",
    durationSeconds: 60, intermediate: { reps: "10-12 reps" }, advanced: { reps: "15 reps" } },

  // Push exercises - Dumbbell
  { name: "Dumbbell floor press", category: "main", muscleGroups: ["chest", "triceps"], equipment: ["dumbbells"], detail: "Elbows at 45°, press up, control down",
    durationSeconds: 75, beginner: { reps: "10 reps", tempo: "3:0:2:0" }, intermediate: { reps: "12 reps", tempo: "3:0:2:0" }, advanced: { reps: "15 reps", tempo: "4:0:2:0" } },
  { name: "Dumbbell shoulder press", category: "main", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbells"], detail: "Press overhead, biceps by ears",
    durationSeconds: 60, beginner: { reps: "8 reps/arm" }, intermediate: { reps: "10 reps/arm" }, advanced: { reps: "12 reps/arm" } },
  { name: "Dumbbell Arnold press", category: "main", muscleGroups: ["shoulders"], equipment: ["dumbbells"], detail: "Rotate palms as you press",
    durationSeconds: 60, intermediate: { reps: "8-10 reps" }, advanced: { reps: "12 reps" } },

  // Push exercises - Kettlebell
  { name: "Kettlebell floor press", category: "main", muscleGroups: ["chest", "triceps"], equipment: ["kettlebells"], detail: "Elbow at 45°, press to lockout",
    durationSeconds: 75, beginner: { reps: "10 reps/arm" }, intermediate: { reps: "12 reps/arm" }, advanced: { reps: "15 reps/arm" } },
  { name: "Kettlebell overhead press", category: "main", muscleGroups: ["shoulders", "triceps"], equipment: ["kettlebells"], detail: "Brace core, press to lockout",
    durationSeconds: 70, beginner: { reps: "6-8 reps/arm" }, intermediate: { reps: "10 reps/arm" }, advanced: { reps: "12 reps/arm" } },
  { name: "Kettlebell push press", category: "main", muscleGroups: ["shoulders", "triceps", "legs"], equipment: ["kettlebells"], detail: "Dip and drive, finish strong",
    durationSeconds: 60, intermediate: { reps: "8-10 reps/arm" }, advanced: { reps: "12 reps/arm" } },

  // Pull exercises - Bodyweight
  { name: "Inverted rows", category: "main", muscleGroups: ["back", "biceps"], equipment: ["bodyweight", "pull-up bar"], detail: "Pull chest to bar, squeeze back",
    durationSeconds: 60, beginner: { reps: "8-10 reps" }, intermediate: { reps: "12 reps" }, advanced: { reps: "15 reps" } },
  { name: "Pull-ups", category: "main", muscleGroups: ["back", "biceps"], equipment: ["pull-up bar"], detail: "Full hang, chin over bar",
    durationSeconds: 60, beginner: { reps: "3-5 reps" }, intermediate: { reps: "8-10 reps" }, advanced: { reps: "12-15 reps" } },
  { name: "Chin-ups", category: "main", muscleGroups: ["back", "biceps"], equipment: ["pull-up bar"], detail: "Palms facing, pull chin over",
    durationSeconds: 60, beginner: { reps: "3-5 reps" }, intermediate: { reps: "8-10 reps" }, advanced: { reps: "12-15 reps" } },
  { name: "Negative pull-ups", category: "main", muscleGroups: ["back", "biceps"], equipment: ["pull-up bar"], detail: "Jump up, lower slowly (5 sec)",
    durationSeconds: 60, beginner: { reps: "5-6 reps" } },

  // Pull exercises - Dumbbell
  { name: "Dumbbell bent-over row", category: "main", muscleGroups: ["back", "biceps"], equipment: ["dumbbells"], detail: "Hinge forward, row to hip",
    durationSeconds: 60, beginner: { reps: "10 reps/arm" }, intermediate: { reps: "12 reps/arm" }, advanced: { reps: "15 reps/arm" } },
  { name: "Dumbbell single-arm row", category: "main", muscleGroups: ["back", "biceps"], equipment: ["dumbbells"], detail: "Support on bench, row to ribs",
    durationSeconds: 70, beginner: { reps: "10 reps/arm" }, intermediate: { reps: "12 reps/arm" }, advanced: { reps: "15 reps/arm" } },

  // Pull exercises - Kettlebell
  { name: "Kettlebell bent-over row", category: "main", muscleGroups: ["back", "biceps"], equipment: ["kettlebells"], detail: "Flat back, row to ribs, pause",
    durationSeconds: 60, beginner: { reps: "10 reps/arm" }, intermediate: { reps: "12 reps/arm" }, advanced: { reps: "15 reps/arm" } },
  { name: "Kettlebell gorilla rows", category: "main", muscleGroups: ["back", "biceps"], equipment: ["kettlebells"], detail: "Wide stance, alternate rows",
    durationSeconds: 90, beginner: { reps: "8 reps/arm" }, intermediate: { reps: "12 reps/arm" }, advanced: { reps: "15 reps/arm" } },
  { name: "Kettlebell high pulls", category: "main", muscleGroups: ["back", "shoulders"], equipment: ["kettlebells"], detail: "Explosive hip snap, elbows high",
    durationSeconds: 45, intermediate: { reps: "12-15 reps" }, advanced: { reps: "20 reps" } },

  // Leg exercises - Bodyweight
  { name: "Bodyweight lunges", category: "main", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight"], detail: "Step forward, back knee low",
    durationSeconds: 60, beginner: { reps: "10 reps/leg" }, intermediate: { reps: "12 reps/leg" }, advanced: { reps: "15 reps/leg" } },
  { name: "Bulgarian split squat", category: "main", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight"], detail: "Rear foot elevated, drop straight down",
    durationSeconds: 90, beginner: { reps: "8 reps/leg" }, intermediate: { reps: "10 reps/leg" }, advanced: { reps: "12 reps/leg" } },
  { name: "Glute bridges", category: "main", muscleGroups: ["glutes", "hamstrings"], equipment: ["bodyweight"], detail: "Squeeze glutes at top, controlled descent",
    durationSeconds: 60, beginner: { reps: "15 reps" }, intermediate: { reps: "20 reps" }, advanced: { reps: "25 reps" } },
  { name: "Single-leg glute bridge", category: "main", muscleGroups: ["glutes", "hamstrings"], equipment: ["bodyweight"], detail: "One leg extended, squeeze at top",
    durationSeconds: 70, intermediate: { reps: "10 reps/leg" }, advanced: { reps: "15 reps/leg" } },

  // Leg exercises - Dumbbell
  { name: "Dumbbell goblet squat", category: "main", muscleGroups: ["quads", "glutes"], equipment: ["dumbbells"], detail: "Hold at chest, sit deep, drive up",
    durationSeconds: 75, beginner: { reps: "10 reps" }, intermediate: { reps: "15 reps" }, advanced: { reps: "20 reps" } },
  { name: "Dumbbell Romanian deadlift", category: "main", muscleGroups: ["hamstrings", "glutes"], equipment: ["dumbbells"], detail: "Soft knees, hinge back, flat back",
    durationSeconds: 75, beginner: { reps: "10 reps" }, intermediate: { reps: "12 reps" }, advanced: { reps: "15 reps" } },
  { name: "Dumbbell step-ups", category: "main", muscleGroups: ["quads", "glutes"], equipment: ["dumbbells"], detail: "Drive through front heel, control down",
    durationSeconds: 70, beginner: { reps: "8 reps/leg" }, intermediate: { reps: "10 reps/leg" }, advanced: { reps: "12 reps/leg" } },

  // Leg exercises - Kettlebell
  { name: "Goblet squats", category: "main", muscleGroups: ["quads", "glutes"], equipment: ["kettlebells"], detail: "Bell at chest, deep squat, drive up",
    durationSeconds: 75, beginner: { reps: "10 reps", tempo: "3:1:2:0" }, intermediate: { reps: "15 reps", tempo: "3:1:2:0" }, advanced: { reps: "20 reps", tempo: "3:1:2:0" } },
  { name: "Kettlebell swing", category: "main", muscleGroups: ["glutes", "hamstrings", "core"], equipment: ["kettlebells"], detail: "Hip snap, float to chest height",
    durationSeconds: 45, beginner: { reps: "15 reps" }, intermediate: { reps: "20 reps" }, advanced: { reps: "25 reps" } },
  { name: "Single-leg RDL", category: "main", muscleGroups: ["hamstrings", "glutes"], equipment: ["kettlebells", "dumbbells"], detail: "Hinge on one leg, flat back",
    durationSeconds: 90, beginner: { reps: "6 reps/leg" }, intermediate: { reps: "10 reps/leg" }, advanced: { reps: "12 reps/leg" } },
  { name: "Kettlebell front squat", category: "main", muscleGroups: ["quads", "core"], equipment: ["kettlebells"], detail: "Bell at rack, stay tall, deep squat",
    durationSeconds: 60, intermediate: { reps: "10 reps" }, advanced: { reps: "15 reps" } },

  // Core exercises
  { name: "Plank", category: "main", muscleGroups: ["core"], equipment: ["bodyweight"], detail: "Straight line from head to heels",
    durationSeconds: 45, beginner: { reps: "30 seconds" }, intermediate: { reps: "45 seconds" }, advanced: { reps: "60 seconds" } },
  { name: "Dead bug", category: "main", muscleGroups: ["core"], equipment: ["bodyweight"], detail: "Back flat, opposite arm/leg extend",
    durationSeconds: 60, beginner: { reps: "8 reps/side" }, intermediate: { reps: "12 reps/side" }, advanced: { reps: "15 reps/side" } },
  { name: "Bird dog", category: "main", muscleGroups: ["core", "back"], equipment: ["bodyweight"], detail: "Extend opposite arm/leg, hold 2 sec",
    durationSeconds: 60, beginner: { reps: "8 reps/side" }, intermediate: { reps: "10 reps/side" }, advanced: { reps: "12 reps/side" } },
  { name: "Mountain climbers", category: "hiit", muscleGroups: ["core", "full_body"], equipment: ["bodyweight"], detail: "Drive knees to chest, quick tempo",
    durationSeconds: 30, beginner: { reps: "20 seconds" }, intermediate: { reps: "30 seconds" }, advanced: { reps: "45 seconds" } },
  { name: "Turkish get-up", category: "main", muscleGroups: ["core", "shoulders", "full_body"], equipment: ["kettlebells"], detail: "Slow and controlled, 5 steps up",
    durationSeconds: 150, beginner: { reps: "2 reps/side" }, intermediate: { reps: "3 reps/side" }, advanced: { reps: "4 reps/side" } },
  { name: "Kettlebell halo", category: "main", muscleGroups: ["shoulders", "core"], equipment: ["kettlebells"], detail: "Circle bell around head, ribs down",
    durationSeconds: 45, beginner: { reps: "8 per direction" }, intermediate: { reps: "10 per direction" }, advanced: { reps: "12 per direction" } },

  // HIIT exercises
  { name: "Burpees", category: "hiit", muscleGroups: ["full_body"], equipment: ["bodyweight"], detail: "Squat, kick to plank, jump up",
    durationSeconds: 45, beginner: { reps: "6-8 reps" }, intermediate: { reps: "10-12 reps" }, advanced: { reps: "15 reps" } },
  { name: "Jump squats", category: "hiit", muscleGroups: ["legs"], equipment: ["bodyweight"], detail: "Squat deep, explode up, land soft",
    durationSeconds: 30, beginner: { reps: "10 reps" }, intermediate: { reps: "15 reps" }, advanced: { reps: "20 reps" } },
  { name: "High knees", category: "hiit", muscleGroups: ["full_body"], equipment: ["bodyweight"], detail: "Drive knees to hip height, quick tempo",
    durationSeconds: 30, beginner: { reps: "20 seconds" }, intermediate: { reps: "30 seconds" }, advanced: { reps: "45 seconds" } },

  // Recovery exercises
  { name: "Stretching flow", category: "recovery", muscleGroups: ["full_body"], equipment: ["bodyweight"], detail: "Hold each stretch 30+ seconds",
    durationSeconds: 120 },
  { name: "Deep breathing", category: "recovery", muscleGroups: ["full_body"], equipment: ["bodyweight"], detail: "4 count in, 6 count out",
    durationSeconds: 60 },
  { name: "Child's pose", category: "recovery", muscleGroups: ["back", "hips"], equipment: ["bodyweight"], detail: "Arms extended, hips to heels",
    durationSeconds: 45 },
  { name: "Pigeon pose", category: "recovery", muscleGroups: ["hips", "glutes"], equipment: ["bodyweight"], detail: "Front shin parallel, fold forward",
    durationSeconds: 60 },
];

// Determine split type based on days per week
function getSplitType(daysPerWeek: number): 'full_body' | 'upper_lower' | 'ppl' {
  if (daysPerWeek <= 3) return 'full_body';
  if (daysPerWeek <= 4) return 'upper_lower';
  return 'ppl';
}

// Get day configurations based on split type and days per week
function getDayConfigs(daysPerWeek: number, splitType: 'full_body' | 'upper_lower' | 'ppl'): DayConfig[] {
  const configs: DayConfig[] = [];

  if (splitType === 'full_body') {
    // 2-3 days: Full body workouts
    const fullBodyDays: Partial<DayConfig>[] = [
      { type: 'full_body', title: 'Full Body Strength A', focus: 'Compound movements focus', muscleGroups: ['chest', 'back', 'legs', 'core'] },
      { type: 'full_body', title: 'Full Body Strength B', focus: 'Different movement patterns', muscleGroups: ['shoulders', 'back', 'legs', 'core'] },
      { type: 'full_body', title: 'Full Body Conditioning', focus: 'Work capacity and endurance', muscleGroups: ['full_body'] },
    ];

    const dayIndices = daysPerWeek === 2 ? [0, 3] : [0, 2, 4]; // Mon/Thu or Mon/Wed/Fri
    for (let i = 0; i < daysPerWeek; i++) {
      configs.push({
        ...fullBodyDays[i % fullBodyDays.length],
        slug: DAY_SLUGS[dayIndices[i]],
        description: `Full body training session ${i + 1}`,
      } as DayConfig);
    }

    // Add rest/recovery days
    for (let i = 0; i < 7; i++) {
      if (!configs.find(c => c.slug === DAY_SLUGS[i])) {
        configs.push({
          slug: DAY_SLUGS[i],
          title: 'Rest Day',
          focus: 'Recovery and mobility',
          description: 'Active recovery or complete rest',
          muscleGroups: [],
          type: 'recovery'
        });
      }
    }
  } else if (splitType === 'upper_lower') {
    // 4 days: Upper/Lower split
    const upperLowerDays: Partial<DayConfig>[] = [
      { type: 'upper', title: 'Upper Body A', focus: 'Push emphasis', muscleGroups: ['chest', 'shoulders', 'triceps', 'back', 'biceps'] },
      { type: 'lower', title: 'Lower Body A', focus: 'Quad dominant', muscleGroups: ['quads', 'glutes', 'hamstrings', 'core'] },
      { type: 'upper', title: 'Upper Body B', focus: 'Pull emphasis', muscleGroups: ['back', 'biceps', 'shoulders', 'chest', 'triceps'] },
      { type: 'lower', title: 'Lower Body B', focus: 'Hip dominant', muscleGroups: ['glutes', 'hamstrings', 'quads', 'core'] },
    ];

    const dayIndices = [0, 1, 3, 4]; // Mon/Tue/Thu/Fri
    for (let i = 0; i < daysPerWeek; i++) {
      configs.push({
        ...upperLowerDays[i],
        slug: DAY_SLUGS[dayIndices[i]],
        description: `${upperLowerDays[i].title} training`,
      } as DayConfig);
    }

    // Add rest days
    for (let i = 0; i < 7; i++) {
      if (!configs.find(c => c.slug === DAY_SLUGS[i])) {
        configs.push({
          slug: DAY_SLUGS[i],
          title: 'Rest Day',
          focus: 'Recovery and mobility',
          description: 'Active recovery or complete rest',
          muscleGroups: [],
          type: 'recovery'
        });
      }
    }
  } else {
    // 5-7 days: Push/Pull/Legs
    const pplDays: Partial<DayConfig>[] = [
      { type: 'push', title: 'Push Day', focus: 'Chest, shoulders, triceps', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { type: 'pull', title: 'Pull Day', focus: 'Back and biceps', muscleGroups: ['back', 'biceps'] },
      { type: 'legs', title: 'Leg Day', focus: 'Quads, glutes, hamstrings', muscleGroups: ['quads', 'glutes', 'hamstrings'] },
      { type: 'push', title: 'Push Day B', focus: 'Shoulder emphasis', muscleGroups: ['shoulders', 'chest', 'triceps'] },
      { type: 'pull', title: 'Pull Day B', focus: 'Row emphasis', muscleGroups: ['back', 'biceps'] },
      { type: 'legs', title: 'Leg Day B', focus: 'Hip dominant', muscleGroups: ['glutes', 'hamstrings', 'quads'] },
      { type: 'hiit', title: 'Conditioning', focus: 'Work capacity', muscleGroups: ['full_body'] },
    ];

    for (let i = 0; i < 7; i++) {
      if (i < daysPerWeek) {
        configs.push({
          ...pplDays[i % pplDays.length],
          slug: DAY_SLUGS[i],
          description: `${pplDays[i % pplDays.length].title} training session`,
        } as DayConfig);
      } else {
        configs.push({
          slug: DAY_SLUGS[i],
          title: 'Rest Day',
          focus: 'Recovery and mobility',
          description: 'Active recovery or complete rest',
          muscleGroups: [],
          type: 'recovery'
        });
      }
    }
  }

  return configs.sort((a, b) => DAY_SLUGS.indexOf(a.slug) - DAY_SLUGS.indexOf(b.slug));
}

// Filter exercises based on available equipment and limitations
function filterExercises(
  exercises: Exercise[],
  availableEquipment: string[],
  limitations: string[]
): Exercise[] {
  // Normalize equipment names
  const normalizedEquipment = new Set(
    availableEquipment.map(e => e.toLowerCase().replace(/s$/, ''))
  );
  normalizedEquipment.add('bodyweight'); // Always available

  return exercises.filter(exercise => {
    // Check if user has required equipment
    const hasEquipment = exercise.equipment.some(eq =>
      normalizedEquipment.has(eq.toLowerCase().replace(/s$/, ''))
    );
    if (!hasEquipment) return false;

    // Check for limitations
    const exerciseNameLower = exercise.name.toLowerCase();
    const exerciseTargets = exercise.muscleGroups.map(m => m.toLowerCase());

    for (const limitation of limitations) {
      const limitLower = limitation.toLowerCase();

      // Skip exercises that might aggravate limitations
      if (limitLower.includes('knee') || limitLower.includes('knie')) {
        if (exerciseNameLower.includes('squat') || exerciseNameLower.includes('lunge') ||
            exerciseNameLower.includes('jump') || exerciseTargets.includes('quads')) {
          return false;
        }
      }
      if (limitLower.includes('shoulder') || limitLower.includes('schulter')) {
        if (exerciseNameLower.includes('press') || exerciseNameLower.includes('pull-up') ||
            exerciseTargets.includes('shoulders')) {
          return false;
        }
      }
      if (limitLower.includes('back') || limitLower.includes('rücken')) {
        if (exerciseNameLower.includes('deadlift') || exerciseNameLower.includes('row') ||
            exerciseNameLower.includes('swing')) {
          return false;
        }
      }
      if (limitLower.includes('wrist') || limitLower.includes('handgelenk')) {
        if (exerciseNameLower.includes('push-up') || exerciseNameLower.includes('plank')) {
          return false;
        }
      }
    }

    return true;
  });
}

// Select exercises for a workout based on muscle groups and available exercises
function selectExercises(
  targetMuscleGroups: string[],
  availableExercises: Exercise[],
  count: number,
  category: RoutineSegmentCategory = 'main'
): Exercise[] {
  const selected: Exercise[] = [];
  const categoryExercises = availableExercises.filter(e => e.category === category);

  // First, try to get exercises that target the muscle groups
  for (const muscleGroup of targetMuscleGroups) {
    if (selected.length >= count) break;

    const matchingExercises = categoryExercises.filter(e =>
      e.muscleGroups.some(m => m.toLowerCase().includes(muscleGroup.toLowerCase())) &&
      !selected.includes(e)
    );

    if (matchingExercises.length > 0) {
      // Pick a random exercise from matching ones
      const randomIndex = Math.floor(Math.random() * matchingExercises.length);
      selected.push(matchingExercises[randomIndex]);
    }
  }

  // If we need more exercises, fill with any available
  while (selected.length < count && categoryExercises.length > selected.length) {
    const remaining = categoryExercises.filter(e => !selected.includes(e));
    if (remaining.length === 0) break;
    const randomIndex = Math.floor(Math.random() * remaining.length);
    selected.push(remaining[randomIndex]);
  }

  return selected;
}

// Build a workout from exercises
function buildWorkout(
  dayConfig: DayConfig,
  exercises: Exercise[],
  profile: UserProfile
): StructuredWorkout {
  const segments: RoutineSegment[] = [];
  let segmentId = 0;

  // Prep segment
  segments.push({
    id: `${dayConfig.slug}-${segmentId++}`,
    title: 'Get ready',
    durationSeconds: 10,
    detail: 'Set up your space and equipment',
    category: 'prep'
  });

  // Get warmup exercises
  const warmupExercises = selectExercises(
    dayConfig.muscleGroups,
    exercises,
    4,
    'warmup'
  );

  // Add warmup
  for (const exercise of warmupExercises) {
    segments.push({
      id: `${dayConfig.slug}-${segmentId++}`,
      title: exercise.name,
      durationSeconds: exercise.durationSeconds,
      detail: exercise.detail,
      category: 'warmup'
    });
  }

  // Handle rest/recovery days
  if (dayConfig.type === 'recovery') {
    const recoveryExercises = selectExercises(
      ['full_body'],
      exercises,
      4,
      'recovery'
    );

    for (const exercise of recoveryExercises) {
      segments.push({
        id: `${dayConfig.slug}-${segmentId++}`,
        title: exercise.name,
        durationSeconds: exercise.durationSeconds,
        detail: exercise.detail,
        category: 'recovery'
      });
    }
  } else {
    // Main exercises
    const mainCount = profile.experienceLevel === 'beginner' ? 3 : profile.experienceLevel === 'intermediate' ? 4 : 5;
    const mainExercises = selectExercises(
      dayConfig.muscleGroups,
      exercises,
      mainCount,
      'main'
    );

    // Determine rounds based on experience and time
    const rounds = profile.experienceLevel === 'beginner' ? 2 : 3;
    const restBetweenRounds = profile.experienceLevel === 'beginner' ? 75 : 60;

    for (let round = 0; round < rounds; round++) {
      for (const exercise of mainExercises) {
        const levelConfig = exercise[profile.experienceLevel];
        const detail = levelConfig
          ? `${levelConfig.reps || ''}${levelConfig.tempo ? ` · Tempo ${levelConfig.tempo}` : ''}`
          : exercise.detail;

        segments.push({
          id: `${dayConfig.slug}-${segmentId++}`,
          title: exercise.name,
          durationSeconds: levelConfig?.duration || exercise.durationSeconds,
          detail: detail.trim() || exercise.detail,
          category: 'main',
          round: rounds > 1 ? `Round ${round + 1}/${rounds}` : undefined
        });
      }

      // Rest between rounds
      if (round < rounds - 1) {
        segments.push({
          id: `${dayConfig.slug}-${segmentId++}`,
          title: 'Rest',
          durationSeconds: restBetweenRounds,
          detail: 'Breathe and prepare for next round',
          category: 'rest',
          round: `Round ${round + 1}/${rounds}`
        });
      }
    }

    // Add HIIT finisher for fat loss goal (we're already in the non-recovery branch)
    if (profile.primaryGoal === 'fat_loss') {
      const hiitExercises = selectExercises(
        ['full_body'],
        exercises,
        2,
        'hiit'
      );

      if (hiitExercises.length > 0) {
        for (const exercise of hiitExercises) {
          const levelConfig = exercise[profile.experienceLevel];
          segments.push({
            id: `${dayConfig.slug}-${segmentId++}`,
            title: exercise.name,
            durationSeconds: levelConfig?.duration || exercise.durationSeconds,
            detail: levelConfig?.reps || exercise.detail,
            category: 'hiit'
          });
        }
      }
    }
  }

  const totalSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0);

  return {
    slug: dayConfig.slug,
    title: dayConfig.title,
    focus: dayConfig.focus,
    description: dayConfig.description,
    segments,
    totalSeconds
  };
}

// Main function to generate workout plan
export async function generateWorkoutPlan(
  userId: string,
  profile: UserProfile
): Promise<StructuredWorkout[]> {
  const splitType = getSplitType(profile.daysPerWeek);
  const dayConfigs = getDayConfigs(profile.daysPerWeek, splitType);

  // Filter exercises based on equipment and limitations
  const availableExercises = filterExercises(
    EXERCISE_LIBRARY,
    profile.equipment,
    profile.limitations
  );

  const workouts: StructuredWorkout[] = [];

  // Generate workout for each day
  for (const dayConfig of dayConfigs) {
    const workout = buildWorkout(dayConfig, availableExercises, profile);
    workouts.push(workout);

    // Save to database
    await query(`
      INSERT INTO workouts (user_id, slug, version, title, focus, description, workout_json, is_active)
      VALUES ($1, $2, 1, $3, $4, $5, $6, true)
      ON CONFLICT (user_id, slug, is_active) WHERE is_active = true
      DO UPDATE SET
        version = workouts.version + 1,
        title = EXCLUDED.title,
        focus = EXCLUDED.focus,
        description = EXCLUDED.description,
        workout_json = EXCLUDED.workout_json,
        updated_at = NOW()
    `, [userId, dayConfig.slug, workout.title, workout.focus, workout.description, JSON.stringify(workout)]);
  }

  return workouts;
}
