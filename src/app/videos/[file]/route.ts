import { NextResponse, type NextRequest } from "next/server";
import { createReadStream, type ReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { ensureVideoDirectory, resolveVideoPath } from "@/lib/media";

const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "public/videos");

async function resolveAssetPath(
  fileName: string
): Promise<{ path: string; size: number } | null> {
  const safeFileName = path.basename(fileName);

  await ensureVideoDirectory();
  const primaryPath = resolveVideoPath(safeFileName);

  const candidates = [primaryPath, path.join(LOCAL_FALLBACK_PATH, safeFileName)];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      const fileStat = await stat(candidate);
      if (!fileStat.isFile()) {
        continue;
      }
      return { path: candidate, size: fileStat.size };
    } catch {
      continue;
    }
  }

  return null;
}

function toWebStream(nodeStream: ReadStream) {
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

function parseRange(range: string | null, size: number) {
  if (!range) return null;

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return null;

  const start = match[1] ? Number.parseInt(match[1], 10) : 0;
  const end = match[2] ? Number.parseInt(match[2], 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return null;
  }

  return {
    start,
    end: Math.min(end, size - 1),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { file: string } | Promise<{ file: string }> },
) {
  const params = await context.params;
  const fileName = params.file;
  if (!fileName || !fileName.toLowerCase().endsWith(".mp4")) {
    return NextResponse.json({ error: "Unsupported media" }, { status: 400 });
  }

  const resolved = await resolveAssetPath(fileName);
  if (!resolved) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const range = parseRange(request.headers.get("range"), resolved.size);
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
  });

  if (range) {
    const { start, end } = range;
    const chunkSize = end - start + 1;
    const stream = createReadStream(resolved.path, { start, end });

    headers.set("Content-Range", `bytes ${start}-${end}/${resolved.size}`);
    headers.set("Content-Length", String(chunkSize));

    return new Response(toWebStream(stream), {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(resolved.size));
  const stream = createReadStream(resolved.path);

  return new Response(toWebStream(stream), {
    status: 200,
    headers,
  });
}
