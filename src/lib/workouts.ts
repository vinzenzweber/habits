import {
  getAssetForDay,
  getPublicThumbnailUrl,
  getPublicVideoUrl,
  listAssignments,
  listAssets,
} from "./media";
import { structuredWorkouts } from "./workoutPlan";
import type { StructuredWorkout } from "./workoutPlan";

export type WorkoutMeta = {
  slug: DaySlug;
  label: string;
  title?: string;
  focus?: string;
  description?: string;
};

export type DaySlug =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WorkoutWithMedia = {
  slug: DaySlug;
  label: string;
  title: string;
  focus?: string;
  description?: string;
  assetId: number | null;
  videoUrl: string | null;
  originalFilename: string | null;
  thumbnailUrl: string | null;
  routine: StructuredWorkout | null;
};

const workoutMetas: WorkoutMeta[] = [
  {
    slug: "monday",
    label: "Monday",
    title: structuredWorkouts.monday.title,
    focus: structuredWorkouts.monday.focus,
    description: structuredWorkouts.monday.description,
  },
  {
    slug: "tuesday",
    label: "Tuesday",
    title: structuredWorkouts.tuesday.title,
    focus: structuredWorkouts.tuesday.focus,
    description: structuredWorkouts.tuesday.description,
  },
  {
    slug: "wednesday",
    label: "Wednesday",
    title: structuredWorkouts.wednesday.title,
    focus: structuredWorkouts.wednesday.focus,
    description: structuredWorkouts.wednesday.description,
  },
  {
    slug: "thursday",
    label: "Thursday",
    title: structuredWorkouts.thursday.title,
    focus: structuredWorkouts.thursday.focus,
    description: structuredWorkouts.thursday.description,
  },
  {
    slug: "friday",
    label: "Friday",
    title: structuredWorkouts.friday.title,
    focus: structuredWorkouts.friday.focus,
    description: structuredWorkouts.friday.description,
  },
  {
    slug: "saturday",
    label: "Saturday",
    title: structuredWorkouts.saturday.title,
    focus: structuredWorkouts.saturday.focus,
    description: structuredWorkouts.saturday.description,
  },
  {
    slug: "sunday",
    label: "Sunday",
    title: structuredWorkouts.sunday.title,
    focus: structuredWorkouts.sunday.focus,
    description: structuredWorkouts.sunday.description,
  },
];

const metaMap = new Map(workoutMetas.map((meta) => [meta.slug, meta]));

export function getWorkoutMetaBySlug(slug: string | undefined | null) {
  if (!slug) {
    return undefined;
  }
  return metaMap.get(slug.toLowerCase() as DaySlug);
}

export async function getWorkoutsWithAssignments(): Promise<WorkoutWithMedia[]> {
  const assignments = await listAssignments();

  return workoutMetas.map((meta) => {
    const assigned = assignments[meta.slug]?.asset ?? null;
    const title = meta.title ?? meta.label;
    return {
      slug: meta.slug,
      label: meta.label,
      title,
      focus: meta.focus,
      description: meta.description,
      assetId: assigned?.id ?? null,
      originalFilename: assigned?.originalFilename ?? null,
      videoUrl: assigned ? getPublicVideoUrl(assigned.storedFilename) : null,
      thumbnailUrl: assigned
        ? getPublicThumbnailUrl(assigned.thumbnailFilename)
        : null,
      routine: structuredWorkouts[meta.slug],
    };
  });
}

export async function getWorkoutForToday(now: Date = new Date()) {
  const dayIndex = now.getDay();
  const ordered: DaySlug[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const slug = ordered[dayIndex];
  const meta = metaMap.get(slug);
  if (!meta) {
    return null;
  }

  const asset = await getAssetForDay(slug);
  return {
    slug: meta.slug,
    label: meta.label,
    title: meta.title ?? meta.label,
    focus: meta.focus,
    description: meta.description,
    assetId: asset?.id ?? null,
    originalFilename: asset?.originalFilename ?? null,
    videoUrl: asset ? getPublicVideoUrl(asset.storedFilename) : null,
    thumbnailUrl: asset ? getPublicThumbnailUrl(asset.thumbnailFilename) : null,
    routine: structuredWorkouts[meta.slug],
  } satisfies WorkoutWithMedia;
}

export async function getWorkoutWithMedia(slug: string) {
  const meta = getWorkoutMetaBySlug(slug);
  if (!meta) {
    return null;
  }
  const asset = await getAssetForDay(meta.slug);
  return {
    slug: meta.slug,
    label: meta.label,
    title: meta.title ?? meta.label,
    focus: meta.focus,
    description: meta.description,
    assetId: asset?.id ?? null,
    originalFilename: asset?.originalFilename ?? null,
    videoUrl: asset ? getPublicVideoUrl(asset.storedFilename) : null,
    thumbnailUrl: asset ? getPublicThumbnailUrl(asset.thumbnailFilename) : null,
    routine: structuredWorkouts[meta.slug],
  } satisfies WorkoutWithMedia;
}

export async function getAvailableAssets() {
  return listAssets();
}

export { workoutMetas };
