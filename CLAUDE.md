# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Habits is a mobile-first Next.js 16 application for guided workout routines. The app displays today's workout on the home screen and provides a full-screen guided timer player for executing any day's routine.

## Development Commands

```bash
npm install              # Install dependencies
npm run dev             # Start Turbopack dev server on http://localhost:3000
npm run build           # Create production build
npm run start           # Serve production build on port 3000
npm run lint            # Run ESLint
```

### Database Setup

PostgreSQL is required. To initialize a local database:

```bash
./scripts/init-local-db.sh
```

Set `DATABASE_URL` in `.env` to connect (see `.env.example`).

### Database Migrations

Migrations ensure all environments have the same schema:

```bash
npm run db:migrate         # Run all pending migrations
npm run db:migrate:status  # Show migration status
```

Migration files are in `scripts/migrations/` with numeric prefixes (e.g., `001_initial_schema.sql`).
Applied migrations are tracked in the `_migrations` table.

## Architecture

### Routing & Pages

- **Next.js App Router** (src/app/)
  - `/` (page.tsx) — Home screen showing today's workout preview
  - `/workouts/[slug]` (workouts/[slug]/page.tsx) — Full-screen guided workout player for a specific day

### Core Data Model

All workout data is defined in `src/lib/workoutPlan.ts`:

- **DaySlug**: String literal type for days of the week (monday-sunday)
- **RoutineSegment**: Individual exercise or rest period with:
  - `title`: Exercise name
  - `durationSeconds`: Duration for this segment
  - `detail`: Exercise instructions or tempo
  - `category`: Type (prep, warmup, main, hiit, recovery, rest)
  - `round`: Optional round indicator for multi-round phases
- **StructuredWorkout**: Complete workout for one day with:
  - `slug`, `title`, `focus`, `description`
  - `segments[]`: Array of RoutineSegments
  - `totalSeconds`: Total workout duration

Workouts are configured via a builder pattern:
1. Define phases with category, rounds, and rest periods
2. `buildStructuredWorkout()` expands phases into a flat segment array
3. Exercise descriptions are auto-populated from `EXERCISE_DESCRIPTIONS`

Key functions:
- `getWorkoutForToday()` — Returns today's workout based on current date
- `getWorkoutBySlug(slug)` — Returns workout for a specific day
- `getAllWorkouts()` — Returns all seven workouts

### UI Components

**GuidedRoutinePlayer** (src/components/GuidedRoutinePlayer.tsx):
- Client component that runs the workout timer
- Auto-starts on mount, plays audio countdown beeps at 4 seconds remaining
- Manages state: currentIndex, remainingSeconds, isRunning, hasFinished
- Category-specific styling via `CATEGORY_STYLES` (color-coded badges/progress bars)
- Wake Lock API to prevent screen sleep during workout

**InstallPrompt** (src/components/InstallPrompt.tsx):
- Prompts users to install the PWA on supported platforms

### Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss`
- Custom theme defined in `src/app/globals.css` using `@theme inline`
- Dark mode optimized (slate-950 background, slate-100 text)
- Custom CSS variables for background/foreground colors
- Geist Sans and Geist Mono fonts via next/font/google

### PWA Configuration

- Progressive Web App manifest at `public/manifest.json`
- Icons: `icon-192.png`, `icon-512.png`, `icon.svg`
- Apple Web App metadata in `src/app/layout.tsx`
- `viewport` config disables user scaling for immersive mobile experience

### Path Aliases

TypeScript path alias `@/*` maps to `./src/*` (see tsconfig.json)

## Deployment

Railway deployment configured via:
- `Dockerfile` — Multi-stage build with Node 20 Alpine
- `railway.toml` — Deployment configuration
- Deploy with: `railway up --build`

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- Module resolution: bundler
- JSX: react-jsx (Next.js 19 compatible)

## Development Principles

**KISS (Keep It Simple, Stupid):**
- Avoid over-engineering and premature abstractions
- Prefer simple, direct solutions over complex architectures
- Add features only when explicitly needed, not for hypothetical future use
- Use existing patterns and libraries; minimize new dependencies
- Simple authentication with NextAuth.js and database sessions
- Single deployment model with multi-user support via PostgreSQL

## Authentication

- NextAuth.js v5 with database session strategy
- Session duration: 30 days (for PWA persistence)
- Credentials provider (email/password)
- User registration auto-creates default workouts
- All routes protected except /login and /register

## Database

Uses PostgreSQL with the following tables:
- `users` - User accounts
- `sessions` - NextAuth.js sessions
- `workouts` - User-scoped workout plans with versioning
- `workout_completions` - Workout completion history
- `chat_sessions` - AI chat sessions
- `chat_messages` - Chat message history
- `user_memories` - Personal trainer memory (equipment, goals, medical, preferences)
- `_migrations` - Migration tracking

All workout and chat data is scoped per user (user_id foreign key).

## Environment Variables

Required for local development:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/habits
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

## AI Personal Trainer

The chat functions as a personal fitness trainer with:

**Capabilities:**
- Expert fitness advice (technique, programming, nutrition basics)
- Workout modifications via `get_workout` and `update_workout` tools
- Web search for current research via `gpt-4o-search-preview`
- Persistent memory of user context (equipment, goals, injuries, preferences)

**Tools:**
- `get_workout` / `update_workout` - View and modify workout plans
- `save_memory` / `get_memories` / `delete_memory` - Remember user info
- `web_search` - Search for current fitness research

**Voice Features:**
- Speech-to-text input via `gpt-4o-mini-transcribe` with fitness terminology prompt
- Text-to-speech output via `gpt-4o-mini-tts` with fitness coach voice

**Tech Stack:**
- OpenAI GPT-4o with function calling (SDK v6.15.0)
- Chat UI accessible via floating button (💬) on all pages
- Workout modifications are versioned in database
