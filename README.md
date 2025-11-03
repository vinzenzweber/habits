## Habits — Mobile-First Workout Library

Habits is a Next.js 16 application for scheduling, uploading, and streaming 20‑minute morning workouts. Each day of the week can be assigned its own video, and `/today` jumps straight into full-screen playback. Uploads persist on a Railway volume and the app generates thumbnails automatically at the one-second mark using FFmpeg.

### Project Layout

- `src/app` — App Router pages (`/`, `/today`, `/admin`, `/videos/[file]`, `/thumbnails/[file]`).
- `src/components` — UI components including the media upload drop zone and workout player.
- `src/lib` — Database access, media helpers, and workout metadata.
- `public/` — Static assets; videos/thumbnails are stored on an attached volume in production.
- `scripts/` — Local database bootstrap helpers.

### Local Development

1. Install Node.js 20+ and a PostgreSQL instance.
2. Copy the environment template and update values:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL` to your local connection string. Optionally override `VIDEO_STORAGE_PATH` and `THUMBNAIL_STORAGE_PATH`; by default uploads land in `/data/videos`.
3. Initialize the database (idempotent):
   ```bash
   ./scripts/init-local-db.sh
   ```
4. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
5. Visit `http://localhost:3000/admin` to upload videos. Large uploads are accepted (server actions capped at 5 GB).

### Production & Railway

- The app ships in a Docker image (see `Dockerfile`) that installs FFmpeg and runs `next start`.
- `railway.toml` configures deployment and mounts an `assets` volume at `/data/videos` for both videos and thumbnails.
- Use `railway up --build` to push a fresh image. Ensure `DATABASE_URL` and any optional overrides (like `NEXT_PUBLIC_VIDEO_BASE_URL`) are set as Railway environment variables.

### Useful Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Launch the Turbopack dev server with hot reload. |
| `npm run build` | Create a production build (used by Docker/Railway). |
| `npm run start` | Serve the compiled app locally on port 3000. |
| `npm run lint` | Run ESLint against the codebase. |

For manual schema management you can also run the SQL in `scripts/init-local-db.sql` inside psql.
