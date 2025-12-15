import type { DaySlug } from "./workouts";

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
          detail: step.detail ?? phase.title,
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
          { title: "Light KB press patterning", durationSeconds: 30 },
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
            title: "Bodyweight inverted rows",
            durationSeconds: 70,
            detail: "12-15 reps · Tempo 3:0:2:0",
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
            detail: "Stabile Fläche, KB bereitstellen",
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
            durationSeconds: 120,
            detail: "3/side · Fokus Stabilität",
          },
          {
            title: "Plank to Down Dog",
            durationSeconds: 90,
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
            title: "Minute 1: KB push press",
            durationSeconds: 60,
            detail: "12 reps · Rest in remaining seconds",
          },
          {
            title: "Minute 2: Burpees",
            durationSeconds: 60,
            detail: "8-10 reps · Rest in remaining seconds",
          },
          {
            title: "Minute 3: KB floor press",
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
      "Dynamisches Warm-up, dann 5 Runden KB Complex (Clean, Front Squat, Push Press, Swing) mit kurzen Pausen.",
    phases: [
      {
        title: "Get ready",
        category: "prep",
        steps: [
          {
            title: "Get ready",
            durationSeconds: 10,
            detail: "Komplex ohne KB absetzen",
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
        title: "KB complex",
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

export function getStructuredWorkout(slug: DaySlug) {
  return structuredWorkouts[slug];
}

export { structuredWorkouts };
