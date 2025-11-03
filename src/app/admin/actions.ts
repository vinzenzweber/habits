"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

import {
  assignAssetToDay,
  ensureVideoDirectory,
  generateStoredFilename,
  recordAsset,
  resolveVideoPath,
  listAssets,
  generateThumbnailForAsset,
  getAssetById,
} from "@/lib/media";
import { getWorkoutMetaBySlug, type DaySlug } from "@/lib/workouts";

function assertDaySlug(value: FormDataEntryValue | null): DaySlug | null {
  if (typeof value !== "string" || value === "none" || value.length === 0) {
    return null;
  }

  const slug = value.toLowerCase();
  const meta = getWorkoutMetaBySlug(slug);
  if (!meta) {
    throw new Error("Invalid day selected");
  }
  return meta.slug;
}

function revalidateAll(day?: string | null) {
  revalidatePath("/");
  revalidatePath("/today");
  if (day) {
    revalidatePath(`/workouts/${day}`);
  }
  revalidatePath("/admin");
}

export async function uploadVideoAction(formData: FormData) {
  const files = formData
    .getAll("videos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    throw new Error("Select at least one video file to upload.");
  }

  await ensureVideoDirectory();
  const existingAssets = await listAssets();
  const existingNames = new Set(
    existingAssets.map((asset) => asset.originalFilename.trim().toLowerCase()),
  );

  for (const file of files) {
    const normalized = file.name.trim().toLowerCase();
    if (existingNames.has(normalized)) {
      continue;
    }
    const storedFilename = generateStoredFilename(file.name);
    const destination = resolveVideoPath(storedFilename);

    const writeStream = createWriteStream(destination, { flags: "wx" });
    await pipeline(
      Readable.fromWeb(file.stream() as unknown as ReadableStream),
      writeStream,
    );

    const asset = await recordAsset({
      storedFilename,
      originalFilename: file.name,
      mimeType: file.type || null,
      sizeBytes: typeof file.size === "number" ? file.size : null,
    });
    try {
      await generateThumbnailForAsset(asset, { force: true });
    } catch (error) {
      console.error("Failed to generate thumbnail", {
        assetId: asset.id,
        storedFilename: asset.storedFilename,
        error,
      });
    }
    existingNames.add(normalized);
  }

  revalidateAll();
}

export async function assignVideoAction(formData: FormData) {
  const dayValue = formData.get("day");
  const day = assertDaySlug(dayValue);

  const currentDay = assertDaySlug(formData.get("currentDay"));

  const assetIdValue = formData.get("assetId");
  const assetId =
    typeof assetIdValue === "string" && assetIdValue !== "none"
      ? Number.parseInt(assetIdValue, 10)
      : null;

  if (assetId !== null && Number.isNaN(assetId)) {
    throw new Error("Invalid asset selection");
  }

  if (!day && currentDay) {
    await assignAssetToDay(currentDay, null);
    revalidateAll(currentDay);
    return;
  }

  if (!day) {
    revalidateAll();
    return;
  }

  if (currentDay && currentDay !== day) {
    await assignAssetToDay(currentDay, null);
  }

  if (assetId === null) {
    await assignAssetToDay(day, null);
  } else {
    await assignAssetToDay(day, assetId);
  }
  revalidateAll(day);
}

export async function redirectToAdmin() {
  redirect("/admin");
}

export async function generateThumbnailAction(formData: FormData) {
  const assetIdValue = formData.get("assetId");
  const assetId =
    typeof assetIdValue === "string" ? Number.parseInt(assetIdValue, 10) : NaN;

  if (!Number.isFinite(assetId)) {
    throw new Error("Invalid asset identifier");
  }

  const asset = await getAssetById(assetId);
  if (!asset) {
    throw new Error("Asset not found");
  }

  await generateThumbnailForAsset(asset, { force: true });
  revalidateAll();
}
