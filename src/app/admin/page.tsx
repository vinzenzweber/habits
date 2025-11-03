import Link from "next/link";

import {
  assignVideoAction,
  generateThumbnailAction,
  uploadVideoAction,
} from "./actions";
import {
  getAvailableAssets,
  getWorkoutsWithAssignments,
  workoutMetas,
  type DaySlug,
} from "@/lib/workouts";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DayAssignmentSelect } from "@/components/DayAssignmentSelect";
import { getPublicThumbnailUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

type WorkoutItem = Awaited<
  ReturnType<typeof getWorkoutsWithAssignments>
>[number];
type AssetItem = Awaited<ReturnType<typeof getAvailableAssets>>[number];

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || Number.isNaN(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

function formatDate(iso: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminPage() {
  const [assets, workouts] = (await Promise.all([
    getAvailableAssets(),
    getWorkoutsWithAssignments(),
  ])) as [
    Awaited<ReturnType<typeof getAvailableAssets>>,
    Awaited<ReturnType<typeof getWorkoutsWithAssignments>>,
  ];

  const assignedDayByAssetId = new Map<number, DaySlug>();
  for (const workout of workouts) {
    if (workout.assetId) {
      assignedDayByAssetId.set(workout.assetId, workout.slug);
    }
  }

  const dayLabelMap = new Map<DaySlug, string>(
    workoutMetas.map((meta) => [meta.slug, meta.label]),
  );

  const sortOrder = new Map<DaySlug, number>(
    workoutMetas.map((meta, index) => [meta.slug, index]),
  );

  const dayOptions = workoutMetas.map((meta) => ({
    value: meta.slug,
    label: meta.label,
  }));

  const sortedAssets = [...assets].sort((a, b) => {
    const dayA = assignedDayByAssetId.get(a.id);
    const dayB = assignedDayByAssetId.get(b.id);

    if (dayA && dayB) {
      return (sortOrder.get(dayA) ?? 0) - (sortOrder.get(dayB) ?? 0);
    }
    if (dayA && !dayB) {
      return -1;
    }
    if (!dayA && dayB) {
      return 1;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            Media Manager
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Upload, manage, and assign workout videos.
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Uploaded files are stored on the persistent volume at
              <code className="ml-2 rounded bg-slate-900 px-2 py-1 text-xs text-emerald-300">
                /data/videos
              </code>
              . Assign each day of the week to the video you want to stream on
              mobile.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit items-center justify-center rounded-full border border-emerald-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/10"
          >
            ← Back to schedule
          </Link>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Upload videos</h2>
          <p className="mt-2 text-sm text-slate-300">
            Drag and drop one or more MP4 files. They&apos;ll be added to your
            library and ready for assignment.
          </p>
          <div className="mt-6">
            <UploadDropzone action={uploadVideoAction} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Uploaded videos</h2>
          <p className="mt-2 text-sm text-slate-300">
            Assign each video to a day of the week. Leave it unassigned to keep
            it in the library for later.
          </p>
          <div className="mt-6 space-y-4">
            {sortedAssets.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-6 text-center text-sm text-slate-400">
                No videos uploaded yet.
              </div>
            ) : (
              sortedAssets.map((asset) => {
                const assignedDay = assignedDayByAssetId.get(asset.id) ?? null;
                const assignedLabel = assignedDay
                  ? dayLabelMap.get(assignedDay) ?? assignedDay
                  : null;
                const thumbnailUrl = getPublicThumbnailUrl(
                  asset.thumbnailFilename,
                );

                return (
                  <div
                    key={asset.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex w-full flex-col rounded-2xl border border-slate-800 bg-slate-950/50 sm:max-w-[200px]">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={`Thumbnail for ${asset.originalFilename}`}
                            className="h-40 w-full rounded-t-2xl object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center rounded-t-2xl bg-slate-900 text-xs text-slate-500">
                            No thumbnail
                          </div>
                        )}
                        <form
                          action={generateThumbnailAction}
                          className="flex items-center justify-center px-4 py-3"
                        >
                          <input type="hidden" name="assetId" value={String(asset.id)} />
                          <button
                            type="submit"
                            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-emerald-400/70 hover:text-emerald-200"
                          >
                            {thumbnailUrl ? "Regenerate" : "Create"} thumbnail
                          </button>
                        </form>
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-3 text-left">
                        <div>
                          <span className="text-base font-semibold text-white">
                            {asset.originalFilename}
                          </span>
                          <div className="mt-1 text-xs text-slate-400">
                            <span>{formatBytes(asset.sizeBytes ?? null)}</span>
                            <span className="mx-2">•</span>
                            <span>{formatDate(asset.createdAt)}</span>
                            {assignedLabel ? (
                              <>
                                <span className="mx-2">•</span>
                                <span>{assignedLabel}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <DayAssignmentSelect
                          assetId={asset.id}
                          currentDay={assignedDay}
                          defaultDay={assignedDay}
                          options={dayOptions}
                          action={assignVideoAction}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
