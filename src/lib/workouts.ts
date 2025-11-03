import {
  getAssetForDay,
  getPublicThumbnailUrl,
  getPublicVideoUrl,
  listAssignments,
  listAssets,
} from "./media";

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
};

const workoutMetas: WorkoutMeta[] = [
  { slug: "monday", label: "Monday" },
  { slug: "tuesday", label: "Tuesday" },
  { slug: "wednesday", label: "Wednesday" },
  { slug: "thursday", label: "Thursday" },
  { slug: "friday", label: "Friday" },
  { slug: "saturday", label: "Saturday" },
  { slug: "sunday", label: "Sunday" },
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
  } satisfies WorkoutWithMedia;
}

export async function getAvailableAssets() {
  return listAssets();
}

export { workoutMetas };
