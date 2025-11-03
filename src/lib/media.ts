import { existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { ensureDatabase, query, type MediaAssetRow } from "./db";

const VIDEO_ROOT = process.env.VIDEO_STORAGE_PATH ?? "/data/videos";
const THUMBNAIL_ROOT =
  process.env.THUMBNAIL_STORAGE_PATH ?? path.join(VIDEO_ROOT, "thumbnails");

const PUBLIC_VIDEO_BASE_URL =
  process.env.NEXT_PUBLIC_VIDEO_BASE_URL ?? "/videos";
const PUBLIC_THUMBNAIL_BASE_URL =
  process.env.NEXT_PUBLIC_THUMBNAIL_BASE_URL ?? "/thumbnails";

const execFile = promisify(execFileCallback);

export type MediaAsset = {
  id: number;
  storedFilename: string;
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  thumbnailFilename: string | null;
};

export type DayAssignment = {
  daySlug: string;
  asset: MediaAsset | null;
};

function mapRow(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    storedFilename: row.stored_filename,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes ? Number.parseInt(row.size_bytes, 10) : null,
    createdAt: row.created_at,
    thumbnailFilename: row.thumbnail_filename ?? null,
  };
}

export async function ensureVideoDirectory() {
  if (!existsSync(VIDEO_ROOT)) {
    await mkdir(VIDEO_ROOT, { recursive: true });
  }
  if (!existsSync(THUMBNAIL_ROOT)) {
    await mkdir(THUMBNAIL_ROOT, { recursive: true });
  }
}

export function resolveVideoPath(filename: string) {
  const safeName = path.basename(filename);
  return path.join(VIDEO_ROOT, safeName);
}

export function resolveThumbnailPath(filename: string) {
  const safeName = path.basename(filename);
  return path.join(THUMBNAIL_ROOT, safeName);
}

export async function recordAsset(options: {
  storedFilename: string;
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  thumbnailFilename?: string | null;
}) {
  await ensureDatabase();
  const result = await query<MediaAssetRow>(
    `INSERT INTO media_assets (stored_filename, original_filename, mime_type, size_bytes, thumbnail_filename)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      options.storedFilename,
      options.originalFilename,
      options.mimeType,
      options.sizeBytes ?? null,
      options.thumbnailFilename ?? null,
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listAssets() {
  await ensureDatabase();
  const result = await query<MediaAssetRow>(
    `SELECT * FROM media_assets ORDER BY created_at DESC`
  );
  return result.rows.map(mapRow);
}

export async function getAssetById(id: number) {
  await ensureDatabase();
  const result = await query<MediaAssetRow>(
    `SELECT * FROM media_assets WHERE id = $1 LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function listAssignments() {
  await ensureDatabase();
  const result = await query<MediaAssetRow & { day_slug: string }>(
    `SELECT da.day_slug, ma.*
     FROM day_assignments da
     LEFT JOIN media_assets ma ON ma.id = da.asset_id`
  );

  return result.rows.reduce<Record<string, DayAssignment>>((acc, row) => {
    acc[row.day_slug] = {
      daySlug: row.day_slug,
      asset: row.id ? mapRow(row) : null,
    };
    return acc;
  }, {});
}

export async function assignAssetToDay(daySlug: string, assetId: number | null) {
  await ensureDatabase();

  if (assetId === null) {
    await query(`DELETE FROM day_assignments WHERE day_slug = $1`, [daySlug]);
    return;
  }

  await query(
    `INSERT INTO day_assignments (day_slug, asset_id)
     VALUES ($1, $2)
     ON CONFLICT (day_slug) DO UPDATE SET asset_id = EXCLUDED.asset_id, assigned_at = NOW()`,
    [daySlug, assetId]
  );
}

export async function cleanupOrphanedAssets() {
  await ensureDatabase();
  const assignments = await query<{ asset_id: number | null }>(
    `SELECT DISTINCT asset_id FROM day_assignments`
  );
  const assignedIds = new Set(
    assignments.rows
      .map((row) => row.asset_id)
      .filter((value): value is number => value !== null)
  );

  const assets = await listAssets();
  const videoDirEntries = await readdir(VIDEO_ROOT, { withFileTypes: true });
  const fileSet = new Set(
    videoDirEntries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  );

  const deletions: string[] = [];
  for (const asset of assets) {
    if (!assignedIds.has(asset.id) && !fileSet.has(asset.storedFilename)) {
      await query(`DELETE FROM media_assets WHERE id = $1`, [asset.id]);
    }
  }

  return deletions;
}

export async function getAssetForDay(daySlug: string) {
  await ensureDatabase();
  const result = await query<MediaAssetRow & { day_slug: string }>(
    `SELECT da.day_slug, ma.*
     FROM day_assignments da
     LEFT JOIN media_assets ma ON ma.id = da.asset_id
     WHERE da.day_slug = $1`,
    [daySlug]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return row.id ? mapRow(row) : null;
}

export function generateStoredFilename(original: string) {
  const extension = path.extname(original) || ".mp4";
  const safeExtension = extension.replace(/[^.\w-]/g, "").slice(0, 10) || ".mp4";
  return `${randomUUID()}${safeExtension}`;
}

export async function getFileSize(filename: string) {
  try {
    const stats = await stat(resolveVideoPath(filename));
    return stats.size;
  } catch {
    return null;
  }
}

function buildThumbnailFilename(storedFilename: string) {
  const { name } = path.parse(storedFilename);
  return `${name}.jpg`;
}

export function getPublicVideoUrl(filename: string) {
  return `${PUBLIC_VIDEO_BASE_URL}/${filename}`;
}

export function getPublicThumbnailUrl(filename: string | null) {
  if (!filename) return null;
  return `${PUBLIC_THUMBNAIL_BASE_URL}/${filename}`;
}

export async function updateAssetThumbnail(
  assetId: number,
  thumbnailFilename: string | null
) {
  await ensureDatabase();
  const result = await query<MediaAssetRow>(
    `UPDATE media_assets SET thumbnail_filename = $1 WHERE id = $2 RETURNING *`,
    [thumbnailFilename, assetId]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function generateThumbnailForAsset(
  asset: MediaAsset,
  { force = false }: { force?: boolean } = {}
) {
  await ensureVideoDirectory();

  const sourcePath = resolveVideoPath(asset.storedFilename);
  const thumbnailFilename = buildThumbnailFilename(asset.storedFilename);
  const thumbnailPath = resolveThumbnailPath(thumbnailFilename);

  if (!force && existsSync(thumbnailPath)) {
    if (asset.thumbnailFilename !== thumbnailFilename) {
      await updateAssetThumbnail(asset.id, thumbnailFilename);
    }
    return thumbnailFilename;
  }

  if (existsSync(thumbnailPath)) {
    try {
      await unlink(thumbnailPath);
    } catch {
      // ignore removal failures; ffmpeg will overwrite with -y flag
    }
  }

  await execFile("ffmpeg", [
    "-y",
    "-ss",
    "1",
    "-i",
    sourcePath,
    "-frames:v",
    "1",
    "-vf",
    "scale=640:-1",
    thumbnailPath,
  ]);

  await updateAssetThumbnail(asset.id, thumbnailFilename);
  return thumbnailFilename;
}
