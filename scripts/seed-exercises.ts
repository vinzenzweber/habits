/**
 * Seed script to populate the exercise library with exercises from EXERCISE_DESCRIPTIONS
 * Run with: npm run db:seed-exercises
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config({ path: '.env' });

import { query } from '../src/lib/db';
import { getOrCreateExercise, type ExerciseCategory } from '../src/lib/exercise-library';
import { queueImageGeneration } from '../src/lib/job-queue';

// Exercise data extracted from workoutPlan.ts EXERCISE_DESCRIPTIONS
// with additional metadata for categorization
const EXERCISES: Array<{
  name: string;
  formCues: string;
  category?: ExerciseCategory;
  muscleGroups?: string[];
  equipment?: string[];
}> = [
  // Prep exercises
  { name: "Get ready", formCues: "Clear space, grab the bell, stand tall, breathe.", category: undefined },

  // Warmup exercises
  { name: "Arm circles (forward/back)", formCues: "Arms straight, small to big circles both ways.", category: "warmup", muscleGroups: ["shoulders"], equipment: ["bodyweight"] },
  { name: "Jumping jacks", formCues: "Hop feet out, arms overhead, land softly.", category: "warmup", muscleGroups: ["full body"], equipment: ["bodyweight"] },
  { name: "Light Kettlebell press patterning", formCues: "Press the bell overhead, lockout, lower under control.", category: "warmup", muscleGroups: ["shoulders", "triceps"], equipment: ["kettlebell"] },
  { name: "Inchworms", formCues: "Hinge down, walk hands to plank, walk back up.", category: "warmup", muscleGroups: ["hamstrings", "core", "shoulders"], equipment: ["bodyweight"] },
  { name: "Arm swings", formCues: "Swing arms across chest, then open wide.", category: "warmup", muscleGroups: ["shoulders", "chest"], equipment: ["bodyweight"] },
  { name: "Shoulder rotations", formCues: "Elbows bent, rotate shoulders forward and back.", category: "warmup", muscleGroups: ["shoulders"], equipment: ["bodyweight"] },
  { name: "Cat-Cow", formCues: "On all fours, round spine then arch with breath.", category: "warmup", muscleGroups: ["spine", "core"], equipment: ["bodyweight"] },
  { name: "Scapula push-ups", formCues: "Plank, keep elbows straight, pinch and spread shoulder blades.", category: "warmup", muscleGroups: ["shoulders", "upper back"], equipment: ["bodyweight"] },
  { name: "Marching in place", formCues: "Lift knees to hip height, keep core tight.", category: "warmup", muscleGroups: ["hip flexors", "core"], equipment: ["bodyweight"] },
  { name: "Leg swings", formCues: "Hold support, swing leg front-to-back, then side-to-side.", category: "warmup", muscleGroups: ["hips", "hamstrings"], equipment: ["bodyweight"] },
  { name: "Bodyweight squats", formCues: "Feet shoulder width, sit hips back, stand tall.", category: "warmup", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight"] },
  { name: "Hip circles", formCues: "Hands on hips, draw slow circles both directions.", category: "warmup", muscleGroups: ["hips"], equipment: ["bodyweight"] },
  { name: "Walking lunges", formCues: "Step forward, drop back knee, push through front heel.", category: "warmup", muscleGroups: ["quads", "glutes", "hamstrings"], equipment: ["bodyweight"] },
  { name: "Spinal rotations", formCues: "Tall posture, rotate torso side to side.", category: "warmup", muscleGroups: ["spine", "obliques"], equipment: ["bodyweight"] },
  { name: "Dead bug", formCues: "Back flat, extend opposite arm/leg, return controlled.", category: "warmup", muscleGroups: ["core"], equipment: ["bodyweight"] },
  { name: "Explosive arm swings", formCues: "Swing arms fast and big to prime speed.", category: "warmup", muscleGroups: ["shoulders"], equipment: ["bodyweight"] },
  { name: "Light jump squats", formCues: "Squat down, jump lightly, land soft and reset.", category: "warmup", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight"] },
  { name: "Dynamic stretches", formCues: "Flow through reaches, lunges, and twists.", category: "warmup", muscleGroups: ["full body"], equipment: ["bodyweight"] },
  { name: "Band pull-aparts / arm swings", formCues: "Pull band to chest or swing arms wide.", category: "warmup", muscleGroups: ["upper back", "shoulders"], equipment: ["band"] },
  { name: "Hip hinges (no weight)", formCues: "Push hips back, torso forward, flat back.", category: "warmup", muscleGroups: ["hamstrings", "glutes"], equipment: ["bodyweight"] },
  { name: "World's greatest stretch", formCues: "Lunge, elbow to instep, rotate chest up.", category: "warmup", muscleGroups: ["hips", "thoracic spine"], equipment: ["bodyweight"] },
  { name: "Mobility flow", formCues: "Smooth full-body circles and hinges.", category: "warmup", muscleGroups: ["full body"], equipment: ["bodyweight"] },
  { name: "Prime all movement patterns", formCues: "Quick mix of squat, hinge, push, pull.", category: "warmup", muscleGroups: ["full body"], equipment: ["bodyweight"] },
  { name: "Gentle movement flow", formCues: "Slow hinges, reaches, and rotations.", category: "warmup", muscleGroups: ["full body"], equipment: ["bodyweight"] },
  { name: "Dynamic full-body prep", formCues: "Traveling reaches, squats, and hinges.", category: "warmup", muscleGroups: ["full body"], equipment: ["bodyweight"] },

  // Main exercises
  { name: "Kettlebell floor press", formCues: "Lie down, elbow at 45 degrees, press bell up, lower to triceps.", category: "main", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["kettlebell"] },
  { name: "Push-ups", formCues: "Hands under shoulders, body straight, lower chest, press up.", category: "main", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["bodyweight"] },
  { name: "Kettlebell overhead press", formCues: "Brace core, press bell overhead, biceps by ear.", category: "main", muscleGroups: ["shoulders", "triceps"], equipment: ["kettlebell"] },
  { name: "Kettlebell bent-over row", formCues: "Hinge, flat back, row bell to ribs, pause, lower.", category: "main", muscleGroups: ["lats", "upper back", "biceps"], equipment: ["kettlebell"] },
  { name: "Kettlebell gorilla rows", formCues: "Wide stance hinge, row one bell, then the other.", category: "main", muscleGroups: ["lats", "upper back", "core"], equipment: ["kettlebell"] },
  { name: "Kettlebell high pulls", formCues: "Hinge and snap hips, pull elbows up and back.", category: "main", muscleGroups: ["upper back", "shoulders", "hips"], equipment: ["kettlebell"] },
  { name: "Goblet squats", formCues: "Hold bell at chest, squat deep, drive up.", category: "main", muscleGroups: ["quads", "glutes"], equipment: ["kettlebell"] },
  { name: "Single-leg RDL", formCues: "Hinge on one leg, reach bell down, stand tall.", category: "main", muscleGroups: ["hamstrings", "glutes", "balance"], equipment: ["kettlebell"] },
  { name: "Kettlebell swing", formCues: "Hike back, snap hips, bell floats to chest height.", category: "main", muscleGroups: ["glutes", "hamstrings", "core"], equipment: ["kettlebell"] },
  { name: "Kettlebell Romanian deadlift", formCues: "Soft knees, hinge back, stand tall.", category: "main", muscleGroups: ["hamstrings", "glutes", "lower back"], equipment: ["kettlebell"] },
  { name: "Renegade rows", formCues: "Plank on bells, row one side, resist rotation.", category: "main", muscleGroups: ["lats", "core"], equipment: ["kettlebell"] },
  { name: "Kettlebell halo", formCues: "Circle bell around head, keep ribs down.", category: "main", muscleGroups: ["shoulders", "core"], equipment: ["kettlebell"] },
  { name: "Kettlebell clean", formCues: "Hike back, pop hips, catch bell softly at rack.", category: "main", muscleGroups: ["full body", "hips"], equipment: ["kettlebell"] },
  { name: "Front squat", formCues: "Bell at rack, squat down, drive up.", category: "main", muscleGroups: ["quads", "glutes", "core"], equipment: ["kettlebell"] },
  { name: "Push press", formCues: "Dip and drive, finish with strong lockout.", category: "main", muscleGroups: ["shoulders", "triceps", "legs"], equipment: ["kettlebell"] },
  { name: "Swing", formCues: "Hinge, snap hips, let bell float, repeat.", category: "main", muscleGroups: ["glutes", "hamstrings", "core"], equipment: ["kettlebell"] },

  // Recovery exercises
  { name: "Core control circuit", formCues: "Brace ribs down, move slow and steady.", category: "recovery", muscleGroups: ["core"], equipment: ["bodyweight"] },
  { name: "Turkish Get-Up (slow)", formCues: "Roll to elbow, post hand, bridge, sweep leg, stand.", category: "recovery", muscleGroups: ["full body", "shoulders", "core"], equipment: ["kettlebell"] },
  { name: "Plank to Down Dog", formCues: "From plank, push hips up, return to plank.", category: "recovery", muscleGroups: ["core", "shoulders"], equipment: ["bodyweight"] },
  { name: "Kettlebell suitcase carry", formCues: "Hold bell at side, walk tall, no leaning.", category: "recovery", muscleGroups: ["core", "grip"], equipment: ["kettlebell"] },

  // HIIT exercises
  { name: "Minute 1: Kettlebell push press", formCues: "Dip knees, drive bell overhead, reset.", category: "hiit", muscleGroups: ["shoulders", "legs"], equipment: ["kettlebell"] },
  { name: "Minute 2: Burpees", formCues: "Squat down, kick to plank, jump up.", category: "hiit", muscleGroups: ["full body"], equipment: ["bodyweight"] },
  { name: "Minute 3: Kettlebell floor press", formCues: "Lie down, press bell up, control the descent.", category: "hiit", muscleGroups: ["chest", "triceps"], equipment: ["kettlebell"] },
  { name: "Minute 4: Mountain climbers", formCues: "Plank, drive knees fast to chest.", category: "hiit", muscleGroups: ["core", "hip flexors"], equipment: ["bodyweight"] },
];

async function seedExercises() {
  console.log('Seeding exercise library...\n');

  let created = 0;
  let existing = 0;
  let queued = 0;

  for (const exerciseData of EXERCISES) {
    try {
      const exercise = await getOrCreateExercise(
        exerciseData.name,
        exerciseData.formCues,
        exerciseData.muscleGroups,
        exerciseData.equipment,
        exerciseData.category
      );

      // Check if this is a new exercise (no images yet)
      const imageCheck = await query(
        `SELECT COUNT(*) as count FROM exercise_images
         WHERE exercise_id = $1 AND generation_status = 'complete'`,
        [exercise.id]
      );

      const hasImages = parseInt(imageCheck.rows[0].count) >= 2;

      if (hasImages) {
        console.log(`  ✓ ${exercise.name} (images ready)`);
        existing++;
      } else {
        // Queue image generation (priority 0 for batch seeding)
        await queueImageGeneration(exercise.id, 0);
        console.log(`  + ${exercise.name} (queued for images)`);
        created++;
        queued++;
      }
    } catch (error) {
      console.error(`  ✗ Error with ${exerciseData.name}:`, error);
    }
  }

  console.log(`\n✓ Seed complete`);
  console.log(`  - ${existing} exercises already had images`);
  console.log(`  - ${created} new exercises added`);
  console.log(`  - ${queued} exercises queued for image generation`);

  // Show job queue status
  const stats = await query(`
    SELECT status, COUNT(*) as count
    FROM image_generation_jobs
    GROUP BY status
  `);

  console.log(`\nJob queue status:`);
  for (const row of stats.rows) {
    console.log(`  - ${row.status}: ${row.count}`);
  }
}

// Run the seed
seedExercises()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
