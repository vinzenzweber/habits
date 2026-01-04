import { auth } from "./auth";
import { query } from "./db";

export type DaySlug =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAY_ORDER: DaySlug[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS: Record<DaySlug, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type RoutineSegmentCategory =
  | "prep"
  | "warmup"
  | "main"
  | "hiit"
  | "recovery"
  | "rest";

export type RoutineSegment = {
  id: string;
  title: string;
  durationSeconds: number;
  detail?: string;
  category: RoutineSegmentCategory;
  round?: string;
};

export type StructuredWorkout = {
  slug: DaySlug;
  title: string;
  focus: string;
  description: string;
  segments: RoutineSegment[];
  totalSeconds: number;
};

type StepConfig = {
  title: string;
  durationSeconds: number;
  detail?: string;
  category?: RoutineSegmentCategory;
};

type PhaseConfig = {
  title: string;
  category: RoutineSegmentCategory;
  rounds?: number;
  restBetweenRoundsSeconds?: number;
  steps: StepConfig[];
};

type WorkoutConfig = {
  slug: DaySlug;
  title: string;
  focus: string;
  description: string;
  phases: PhaseConfig[];
};

export type WorkoutDay = StructuredWorkout & {
  label: string;
};

const EXERCISE_DESCRIPTIONS: Record<string, string> = {
  "Get ready": "Clear space, grab the bell, stand tall, breathe.",
  "Arm circles (forward/back)": "Arms straight, small to big circles both ways.",
  "Jumping jacks": "Hop feet out, arms overhead, land softly.",
  "Light Kettlebell press patterning": "Press the bell overhead, lockout, lower under control.",
  "Inchworms": "Hinge down, walk hands to plank, walk back up.",
  "Arm swings": "Swing arms across chest, then open wide.",
  "Shoulder rotations": "Elbows bent, rotate shoulders forward and back.",
  "Cat-Cow": "On all fours, round spine then arch with breath.",
  "Scapula push-ups": "Plank, keep elbows straight, pinch and spread shoulder blades.",
  "Marching in place": "Lift knees to hip height, keep core tight.",
  "Leg swings": "Hold support, swing leg front-to-back, then side-to-side.",
  "Bodyweight squats": "Feet shoulder width, sit hips back, stand tall.",
  "Hip circles": "Hands on hips, draw slow circles both directions.",
  "Walking lunges": "Step forward, drop back knee, push through front heel.",
  "Spinal rotations": "Tall posture, rotate torso side to side.",
  "Dead bug": "Back flat, extend opposite arm/leg, return controlled.",
  "Explosive arm swings": "Swing arms fast and big to prime speed.",
  "Light jump squats": "Squat down, jump lightly, land soft and reset.",
  "Dynamic stretches": "Flow through reaches, lunges, and twists.",
  "Band pull-aparts / arm swings": "Pull band to chest or swing arms wide.",
  "Hip hinges (no weight)": "Push hips back, torso forward, flat back.",
  "World's greatest stretch": "Lunge, elbow to instep, rotate chest up.",
  "Mobility flow": "Smooth full-body circles and hinges.",
  "Prime all movement patterns": "Quick mix of squat, hinge, push, pull.",
  "Kettlebell floor press": "Lie down, elbow at 45 degrees, press bell up, lower to triceps.",
  "Push-ups": "Hands under shoulders, body straight, lower chest, press up.",
  "Kettlebell overhead press": "Brace core, press bell overhead, biceps by ear.",
  "Kettlebell bent-over row": "Hinge, flat back, row bell to ribs, pause, lower.",
  "Kettlebell gorilla rows": "Wide stance hinge, row one bell, then the other.",
  "Kettlebell high pulls": "Hinge and snap hips, pull elbows up and back.",
  "Goblet squats": "Hold bell at chest, squat deep, drive up.",
  "Single-leg RDL": "Hinge on one leg, reach bell down, stand tall.",
  "Kettlebell swing": "Hike back, snap hips, bell floats to chest height.",
  "Gentle movement flow": "Slow hinges, reaches, and rotations.",
  "Core control circuit": "Brace ribs down, move slow and steady.",
  "Turkish Get-Up (slow)": "Roll to elbow, post hand, bridge, sweep leg, stand.",
  "Plank to Down Dog": "From plank, push hips up, return to plank.",
  "Kettlebell suitcase carry": "Hold bell at side, walk tall, no leaning.",
  "Minute 1: Kettlebell push press": "Dip knees, drive bell overhead, reset.",
  "Minute 2: Burpees": "Squat down, kick to plank, jump up.",
  "Minute 3: Kettlebell floor press": "Lie down, press bell up, control the descent.",
  "Minute 4: Mountain climbers": "Plank, drive knees fast to chest.",
  "Kettlebell Romanian deadlift": "Soft knees, hinge back, stand tall.",
  "Renegade rows": "Plank on bells, row one side, resist rotation.",
  "Kettlebell halo": "Circle bell around head, keep ribs down.",
  "Dynamic full-body prep": "Traveling reaches, squats, and hinges.",
  "Kettlebell clean": "Hike back, pop hips, catch bell softly at rack.",
  "Front squat": "Bell at rack, squat down, drive up.",
  "Push press": "Dip and drive, finish with strong lockout.",
  "Swing": "Hinge, snap hips, let bell float, repeat.",
};

function describeExercise(title: string) {
  return EXERCISE_DESCRIPTIONS[title] ?? "Controlled reps with steady tempo.";
}

function buildStructuredWorkout(config: WorkoutConfig): StructuredWorkout {
  const segments: RoutineSegment[] = [];

  for (const phase of config.phases) {
    const rounds = phase.rounds ?? 1;
    for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
      for (const step of phase.steps) {
        segments.push({
          id: `${config.slug}-${segments.length}`,
          title: step.title,
          durationSeconds: step.durationSeconds,
          detail: step.detail ?? describeExercise(step.title),
          category: step.category ?? phase.category,
          round: rounds > 1 ? `Round ${roundIndex + 1}/${rounds}` : undefined,
        });
      }

      if (
        phase.restBetweenRoundsSeconds &&
        roundIndex < rounds - 1
      ) {
        segments.push({
          id: `${config.slug}-${segments.length}`,
          title: "Rest",
          durationSeconds: phase.restBetweenRoundsSeconds,
          detail: "Reset before the next round",
          category: "rest",
          round: `Round ${roundIndex + 1}/${rounds}`,
        });
      }
    }
  }

  const totalSeconds = segments.reduce(
    (total, segment) => total + segment.durationSeconds,
    0,
  );

  return {
    slug: config.slug,
    title: config.title,
    focus: config.focus,
    description: config.description,
    segments,
    totalSeconds,
  };
}

const structuredWorkouts: Record<DaySlug, StructuredWorkout> = {
  monday: buildStructuredWorkout({
    slug: "monday",
    title: "Push (Moderate)",
    focus: "Drückbewegungen mit Kraft-Ausdauer Tempo",
    description:
      "Warm-up, dann 3 Runden Floor Press, Push-ups und Overhead Press mit kontrolliertem Tempo. 60 Sekunden Pause zwischen den Runden.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Raum freimachen, Kettlebell greifen, Timer startet automatisch",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Arm circles (forward/back)", durationSeconds: 30 },
          { title: "Jumping jacks", durationSeconds: 30 },
          { title: "Light Kettlebell press patterning", durationSeconds: 30 },
          { title: "Inchworms", durationSeconds: 30 },
        ],
      },
      {
        title: "Main push circuit",
        category: "main",
        rounds: 3,
        restBetweenRoundsSeconds: 60,
        steps: [
          {
            title: "Kettlebell floor press",
            durationSeconds: 75,
            detail: "15 reps · Tempo 3:0:2:0",
          },
          {
            title: "Push-ups",
            durationSeconds: 70,
            detail: "12-15 reps · Tempo 3:0:2:0",
          },
          {
            title: "Kettlebell overhead press",
            durationSeconds: 72,
            detail: "8-10/arm · Tempo 2:0:2:0",
          },
        ],
      },

    ],
  }),
  tuesday: buildStructuredWorkout({
    slug: "tuesday",
    title: "Pull (Moderate)",
    focus: "Zugbewegungen mit ruhigem Tempo",
    description:
      "Warm-up, dann 3 Runden Rows, Inverted Rows und High Pulls. 60 Sekunden Pause zwischen den Runden.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Timer läuft automatisch an",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Arm swings", durationSeconds: 30 },
          { title: "Shoulder rotations", durationSeconds: 30 },
          { title: "Cat-Cow", durationSeconds: 30 },
          { title: "Scapula push-ups", durationSeconds: 30 },
        ],
      },
      {
        title: "Main pull circuit",
        category: "main",
        rounds: 3,
        restBetweenRoundsSeconds: 60,
        steps: [
          {
            title: "Kettlebell bent-over row",
            durationSeconds: 60,
            detail: "12/arm · Tempo 3:0:2:0",
          },
          {
            title: "Kettlebell gorilla rows",
            durationSeconds: 120,
            detail: "12/arm · Tempo 3:0:2:0",
          },
          {
            title: "Kettlebell high pulls",
            durationSeconds: 30,
            detail: "15 reps · Explosive 1:0:1:0",
          },
        ],
      },

    ],
  }),
  wednesday: buildStructuredWorkout({
    slug: "wednesday",
    title: "Legs (High)",
    focus: "Unterkörper mit hoher Time Under Tension",
    description:
      "Warm-up, dann 3 Runden Goblet Squats, Single-Leg RDLs und Swings. 75 Sekunden Pause zwischen den Runden.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Stabile Fläche, Kettlebell bereitstellen",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Marching in place", durationSeconds: 30 },
          { title: "Leg swings", durationSeconds: 30 },
          { title: "Bodyweight squats", durationSeconds: 30 },
          { title: "Hip circles", durationSeconds: 30 },
          { title: "Walking lunges", durationSeconds: 60 },
        ],
      },
      {
        title: "Leg strength circuit",
        category: "main",
        rounds: 3,
        restBetweenRoundsSeconds: 75,
        steps: [
          {
            title: "Goblet squats",
            durationSeconds: 90,
            detail: "15 reps · Tempo 3:1:2:0",
          },
          {
            title: "Single-leg RDL",
            durationSeconds: 120,
            detail: "10/leg · Tempo 3:2:1:0",
          },
          {
            title: "Kettlebell swing",
            durationSeconds: 45,
            detail: "20 reps · Explosive",
          },
        ],
      },

    ],
  }),
  thursday: buildStructuredWorkout({
    slug: "thursday",
    title: "Core + Active Recovery",
    focus: "Langsame Kontrolle und Stabilität",
    description:
      "Sanftes Warm-up, dann 3 Runden Turkish Get-Ups, Plank to Down Dog und Suitcase Carries. 60 Sekunden Pause zwischen den Runden.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Atme tief durch, Fokus auf saubere Kontrolle",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Gentle movement flow", durationSeconds: 60 },
          { title: "Spinal rotations", durationSeconds: 30 },
          { title: "Dead bug", durationSeconds: 30 },
        ],
      },
      {
        title: "Core control circuit",
        category: "recovery",
        rounds: 3,
        restBetweenRoundsSeconds: 60,
        steps: [
          {
            title: "Turkish Get-Up (slow)",
            durationSeconds: 150,
            detail: "3/side · Fokus Stabilität",
          },
          {
            title: "Plank to Down Dog",
            durationSeconds: 60,
            detail: "10 reps · Tempo 3:1:3:1",
          },
          {
            title: "Kettlebell suitcase carry",
            durationSeconds: 60,
            detail: "30s/side · aufrecht bleiben",
          },
        ],
      },

    ],
  }),
  friday: buildStructuredWorkout({
    slug: "friday",
    title: "Push + HIIT (High)",
    focus: "EMOM Druck plus Herzfrequenz",
    description:
      "Kurzes Warm-up, dann 12 Minuten EMOM mit Push Press, Burpees, Floor Press und Mountain Climbers.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Starte direkt in den EMOM",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Explosive arm swings", durationSeconds: 30 },
          { title: "Light jump squats", durationSeconds: 30 },
          { title: "Dynamic stretches", durationSeconds: 60 },
        ],
      },
      {
        title: "EMOM block",
        category: "hiit",
        rounds: 3,
        steps: [
          {
            title: "Minute 1: Kettlebell push press",
            durationSeconds: 60,
            detail: "12 reps · Rest in remaining seconds",
          },
          {
            title: "Minute 2: Burpees",
            durationSeconds: 60,
            detail: "8-10 reps · Rest in remaining seconds",
          },
          {
            title: "Minute 3: Kettlebell floor press",
            durationSeconds: 60,
            detail: "15 reps · Rest in remaining seconds",
          },
          {
            title: "Minute 4: Mountain climbers",
            durationSeconds: 60,
            detail: "30s max effort then breathe",
          },
        ],
      },

    ],
  }),
  saturday: buildStructuredWorkout({
    slug: "saturday",
    title: "Pull + Posterior (Moderate)",
    focus: "Hamstring + Rücken mit Core-Stabilität",
    description:
      "Warm-up, dann 4 kurze Runden RDL, Renegade Rows und Halos. 45 Sekunden Pause zwischen den Runden.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Aufstellung prüfen, Griff sicher",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Band pull-aparts / arm swings", durationSeconds: 30 },
          { title: "Hip hinges (no weight)", durationSeconds: 30 },
          { title: "Cat-Cow", durationSeconds: 30 },
          { title: "World's greatest stretch", durationSeconds: 30 },
        ],
      },
      {
        title: "Posterior chain circuit",
        category: "main",
        rounds: 4,
        restBetweenRoundsSeconds: 45,
        steps: [
          {
            title: "Kettlebell Romanian deadlift",
            durationSeconds: 90,
            detail: "15 reps · Tempo 4:1:2:0",
          },
          {
            title: "Renegade rows",
            durationSeconds: 65,
            detail: "8/side · Anti-Rotation",
          },
          {
            title: "Kettlebell halo",
            durationSeconds: 55,
            detail: "10 per direction · kontrolliert",
          },
        ],
      },

    ],
  }),
  sunday: buildStructuredWorkout({
    slug: "sunday",
    title: "Total Body Conditioning",
    focus: "Komplex für Ganzkörper-Kondition",
    description:
      "Dynamisches Warm-up, dann 5 Runden Kettlebell Complex (Clean, Front Squat, Push Press, Swing) mit kurzen Pausen.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Komplex ohne Kettlebell absetzen",
          },
        ],
      },
      {
        title: "Warm-up",
        category: "warmup",
        steps: [
          { title: "Dynamic full-body prep", durationSeconds: 60 },
          { title: "Mobility flow", durationSeconds: 60 },
          { title: "Prime all movement patterns", durationSeconds: 60 },
        ],
      },
      {
        title: "Kettlebell complex",
        category: "main",
        rounds: 5,
        restBetweenRoundsSeconds: 60,
        steps: [
          {
            title: "Kettlebell clean",
            durationSeconds: 25,
            detail: "6/side · explosive",
          },
          {
            title: "Front squat",
            durationSeconds: 25,
            detail: "8 reps · stay tall",
          },
          {
            title: "Push press",
            durationSeconds: 25,
            detail: "6/side · dip + drive",
          },
          {
            title: "Swing",
            durationSeconds: 20,
            detail: "15 reps · hip snap",
          },
        ],
      },

    ],
  }),
};

function isDaySlug(value: string): value is DaySlug {
  return (DAY_ORDER as string[]).includes(value);
}

export function getStructuredWorkout(slug: DaySlug) {
  return structuredWorkouts[slug];
}

export async function getWorkoutBySlug(slug: string | null | undefined): Promise<WorkoutDay | null> {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  if (!isDaySlug(normalized)) return null;

  const session = await auth();
  if (!session?.user?.id) return null;

  const result = await query(`
    SELECT workout_json FROM workouts
    WHERE user_id = $1 AND slug = $2 AND is_active = true
  `, [session.user.id, normalized]);

  if (result.rows.length === 0) return null;

  const workout = result.rows[0].workout_json;
  return {
    ...workout,
    label: DAY_LABELS[normalized],
  };
}

export async function getWorkoutForToday(now: Date = new Date()): Promise<WorkoutDay | null> {
  const slug = DAY_ORDER[now.getDay()];
  return getWorkoutBySlug(slug);
}

export async function getAllWorkouts(): Promise<WorkoutDay[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const result = await query(`
    SELECT workout_json FROM workouts
    WHERE user_id = $1 AND is_active = true
    ORDER BY CASE slug
      WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4
      WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
      WHEN 'sunday' THEN 7
    END
  `, [session.user.id]);

  return result.rows.map(row => {
    const workout = row.workout_json as StructuredWorkout;
    return {
      ...workout,
      label: DAY_LABELS[workout.slug]
    };
  });
}

/**
 * Get completion status for all workouts today
 * Returns a record of slug -> boolean indicating if completed today
 */
export async function getTodayCompletions(): Promise<Record<DaySlug, boolean>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {} as Record<DaySlug, boolean>;
  }

  const result = await query(`
    SELECT w.slug
    FROM workout_completions wc
    JOIN workouts w ON wc.workout_id = w.id
    WHERE wc.user_id = $1
      AND wc.completed_at >= CURRENT_DATE
      AND wc.completed_at < CURRENT_DATE + INTERVAL '1 day'
  `, [session.user.id]);

  const completions: Record<string, boolean> = {};
  for (const slug of DAY_ORDER) {
    completions[slug] = false;
  }
  for (const row of result.rows) {
    completions[row.slug] = true;
  }

  return completions as Record<DaySlug, boolean>;
}

/**
 * Get the next uncompleted workout
 * Returns today's workout if not completed, otherwise returns tomorrow's
 */
export async function getNextUncompletedWorkout(now: Date = new Date()): Promise<WorkoutDay | null> {
  const todaySlug = DAY_ORDER[now.getDay()];
  const completions = await getTodayCompletions();

  // If today's workout is not completed, return it
  if (!completions[todaySlug]) {
    return getWorkoutBySlug(todaySlug);
  }

  // Otherwise, return tomorrow's workout
  const tomorrowIndex = (now.getDay() + 1) % 7;
  const tomorrowSlug = DAY_ORDER[tomorrowIndex];
  return getWorkoutBySlug(tomorrowSlug);
}

/**
 * Get the slug of today's day
 */
export function getTodaySlug(now: Date = new Date()): DaySlug {
  return DAY_ORDER[now.getDay()];
}

export { structuredWorkouts, DAY_ORDER, DAY_LABELS };
