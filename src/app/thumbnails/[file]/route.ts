import { NextResponse, type NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { ensureVideoDirectory, resolveThumbnailPath } from "@/lib/media";

const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "public/thumbnails");

async function resolveThumbnail(fileName: string) {
  const safeFileName = path.basename(fileName);

  await ensureVideoDirectory();
  const primaryPath = resolveThumbnailPath(safeFileName);

  const candidates = [primaryPath, path.join(LOCAL_FALLBACK_PATH, safeFileName)];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      const fileStat = await stat(candidate);
      if (!fileStat.isFile()) {
        continue;
      }
      return { path: candidate, size: fileStat.size } as const;
    } catch {
      continue;
    }
  }

  return null;
}

function toWebStream(stream: Readable) {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

function detectContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function GET(
  request: NextRequest,
  context: { params: { file: string } | Promise<{ file: string }> },
) {
  const params = await context.params;
  const fileName = params.file;
  if (!fileName) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const resolved = await resolveThumbnail(fileName);
  if (!resolved) {
    return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": detectContentType(fileName),
    "Content-Length": String(resolved.size),
    "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
  });

  const stream = createReadStream(resolved.path);
  return new Response(toWebStream(stream), {
    status: 200,
    headers,
  });
}
