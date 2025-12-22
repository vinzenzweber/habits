## Habits — Mobile-First Workout Routines

Habits is a Next.js 16 application for running a structured morning workout plan. The home screen previews today’s routine, and `/workouts/[slug]` launches the guided timer view for any day.

### Project Layout

- `src/app` — App Router pages (`/`, `/workouts/[slug]`).
- `src/components` — UI components including the guided workout player.
- `src/lib` — Workout plan and PWA helpers.
- `public/` — Static assets.

### Local Development

1. Install Node.js 20+.
2. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Visit `http://localhost:3000` to preview today’s routine.

### Production & Railway

- The app ships in a Docker image (see `Dockerfile`) that runs `next start`.
- `railway.toml` configures deployment for the Next.js app.
- Use `railway up --build` to push a fresh image.

### Useful Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Launch the Turbopack dev server with hot reload. |
| `npm run build` | Create a production build (used by Docker/Railway). |
| `npm run start` | Serve the compiled app locally on port 3000. |
| `npm run lint` | Run ESLint against the codebase. |
