import type { RoutineSegment } from "./workoutPlan";

// Extended workout type that allows 'nano' as a special slug
export type NanoWorkoutSlug = "nano";

export type NanoWorkout = {
  slug: NanoWorkoutSlug;
  title: string;
  focus: string;
  description: string;
  segments: RoutineSegment[];
  totalSeconds: number;
};

export const NANO_WEEKLY_LIMIT = 2;

/**
 * The nano workout is a 3-minute minimal workout for maintaining streaks
 * on days when motivation is low, traveling, or feeling unwell.
 *
 * Consists of: 10 squats, 10 push-ups, 10 crunches
 * With short rests between exercises.
 */
export const NANO_WORKOUT: NanoWorkout = {
  slug: "nano",
  title: "Nano Workout",
  focus: "Streak saver",
  description: "A quick 3-minute workout to maintain your streak on tough days. Just 10 squats, 10 push-ups, and 10 crunches.",
  totalSeconds: 180,
  segments: [
    {
      id: "nano-prep",
      title: "Get Ready",
      durationSeconds: 10,
      detail: "Stand tall, take a breath",
      category: "prep",
    },
    {
      id: "nano-squats",
      title: "Squats",
      durationSeconds: 45,
      detail: "10 reps - feet shoulder width, sit back, stand tall",
      category: "main",
    },
    {
      id: "nano-rest-1",
      title: "Rest",
      durationSeconds: 15,
      detail: "Breathe",
      category: "rest",
    },
    {
      id: "nano-pushups",
      title: "Push-ups",
      durationSeconds: 45,
      detail: "10 reps - hands wide, chest to floor, push up strong",
      category: "main",
    },
    {
      id: "nano-rest-2",
      title: "Rest",
      durationSeconds: 15,
      detail: "Breathe",
      category: "rest",
    },
    {
      id: "nano-crunches",
      title: "Crunches",
      durationSeconds: 45,
      detail: "10 reps - lift shoulders, squeeze abs, lower controlled",
      category: "main",
    },
    {
      id: "nano-done",
      title: "Done!",
      durationSeconds: 5,
      detail: "Streak saved!",
      category: "recovery",
    },
  ],
};
