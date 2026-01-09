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
  - `/login` — User login page
  - `/register` — User registration page
  - `/logout` — Logout handler
  - `/onboarding` — New user onboarding chat
  - `/workouts/[slug]` — Workout detail/preview page
  - `/workouts/[slug]/play` — Full-screen guided workout player
  - `/workouts/nano` — Nano workout preview
  - `/workouts/nano/play` — Nano workout player

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

**Production URL:** https://fitstreak.app

Railway deployment configured via:
- `Dockerfile` — Multi-stage build with Node 20 Alpine
- `railway.toml` — Deployment configuration
- Deploy with: `railway up --build`

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- Module resolution: bundler
- JSX: react-jsx (Next.js 16 compatible)

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

## Streak Preservation System

The app includes a streak preservation system to help users maintain their workout streak on difficult days (low motivation, illness, travel).

### Three Protection Mechanisms

| Mechanism | Description | Limit |
|-----------|-------------|-------|
| **Nano Workout** | 3-minute minimal workout (10 squats, 10 push-ups, 10 crunches) | Max 2 per week |
| **Streak Shield** | Earned freeze that auto-applies on missed days | Max stockpile: 2 |
| **Rest Day** | 1 built-in rest day per 7-day rolling period | 1 per 7 days |

### How Shields Are Earned

- Complete 7 consecutive **full** workouts to earn 1 shield
- Nano workouts count toward maintaining streak but NOT toward earning shields
- Shields auto-apply when you miss a day (if available)
- Maximum stockpile of 2 shields

### Key Files

- `src/lib/nanoWorkout.ts` - Nano workout definition
- `src/lib/streakShields.ts` - Shield and streak preservation logic
- `src/app/workouts/nano/` - Nano workout pages
- `src/app/api/workouts/nano/` - Nano workout API
- `src/app/api/streak/` - Streak shield and check APIs
- `src/components/NanoWorkoutCard.tsx` - Home page nano prompt
- `src/components/ShieldBanner.tsx` - Shield notification banner

### API Endpoints

- `GET /api/workouts/nano` - Check nano availability and get workout
- `POST /api/workouts/nano/complete` - Complete nano workout
- `GET /api/streak/shields` - Get shield status
- `POST /api/streak/shields` - Manually use a shield
- `GET /api/streak/check` - Get streak preservation status
- `POST /api/streak/check` - Check and auto-apply shields

### Completion Types

The `workout_completions` table tracks different completion types:
- `full` - Regular daily workout
- `nano` - Nano workout (3-minute minimal)
- `shield` - Shield auto-applied for missed day
- `rest` - Designated rest day

## Database

Uses PostgreSQL with the following tables:
- `users` - User accounts
- `sessions` - NextAuth.js sessions
- `workouts` - User-scoped workout plans with versioning
- `workout_completions` - Workout completion history (with `completion_type`: full, nano, shield, rest)
- `streak_shields` - Earned/used streak protection shields
- `nano_workout_usage` - Weekly nano workout usage tracking
- `rest_day_usage` - Rest day tracking for streak preservation
- `chat_sessions` - AI chat sessions
- `chat_messages` - Chat message history
- `user_memories` - Personal trainer memory (equipment, goals, medical, preferences)
- `exercises` - Global exercise library with metadata
- `exercise_images` - AI-generated exercise illustrations (2 per exercise)
- `image_generation_jobs` - Background job queue for image generation
- `_migrations` - Migration tracking

All workout and chat data is scoped per user (user_id foreign key).
Exercise library is global (shared across all users).

## Environment Variables

Required for local development:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/habits
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

For exercise image generation:
```bash
IMAGE_STORAGE_PATH=/data/images          # Railway volume mount path
ADMIN_API_TOKEN=generate-with-openssl-rand-base64-32  # Protects admin endpoints
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
- `search_exercises` - Find exercises in library (prefer ones with images ready)
- `create_exercise` - Add new exercise (auto-queues image generation)
- `get_exercise_images` - Check image generation status

**Voice Features:**
- Speech-to-text input via `gpt-4o-mini-transcribe` with fitness terminology prompt
- Text-to-speech output via `gpt-4o-mini-tts` with fitness coach voice

**Tech Stack:**
- OpenAI GPT-4o with function calling (SDK v6.15.0)
- Chat UI: floating button (💬) opens right sidebar on desktop, full-screen modal on mobile
- Workout modifications are versioned in database

## Exercise Images

Each exercise has 2 AI-generated illustration images (start position and end position) stored in a global library shared across all users.

### Architecture

```
exercises table → exercise_images table → Railway volume (/data/images)
                         ↑
              image_generation_jobs (background queue)
```

### Image Generation Pipeline

1. Exercise added to library (via seed script or AI chat)
2. Job queued in `image_generation_jobs` table
3. Worker processes job: web search → gpt-image-1 generation → save to volume
4. Images served via `/api/exercises/[name]/images/[1|2]`

### Commands

```bash
npm run db:seed-exercises  # Seed 50 exercises from EXERCISE_DESCRIPTIONS
```

### Processing Pending Images

#### Option 1: Railway Cron Service

Create a separate Railway service that runs on a schedule:

1. In Railway dashboard, create a new service in your project
2. Use the same Docker image but with a different start command:
   ```bash
   while true; do
     curl -X POST http://localhost:3000/api/admin/process-images \
       -H "Authorization: Bearer $ADMIN_API_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"maxJobs": 1}';
     sleep 30;
   done
   ```
3. Or use Railway's cron feature (if available) to hit the endpoint every minute

#### Option 2: Manual Processing (Local Development)

Process images on-demand using curl:

```bash
# Process 1 image
curl -X POST http://localhost:3000/api/admin/process-images \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json"

# Process up to 5 images at once
curl -X POST http://localhost:3000/api/admin/process-images \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 5}'

# Check queue status
curl http://localhost:3000/api/admin/process-images \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN"

# Retry failed jobs and reset stuck jobs
curl -X POST http://localhost:3000/api/admin/process-images \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 5, "retryFailed": true, "resetStuck": true}'
```

Each image takes ~30 seconds to generate. For 50 exercises (100 images), expect ~50 minutes total processing time.

### UI Integration

- `ExerciseImages` component displays images with position toggle (1/2)
- Integrated in workout detail page and guided player
- Images hidden for `prep` and `rest` segments
- Gracefully handles missing images (no broken UI)

## Testing

### Test Commands

```bash
npm test              # Run unit tests in watch mode
npm run test:unit     # Run unit tests once
npm run test:coverage # Run with coverage report
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run E2E with interactive UI
npm run test:e2e:headed # Run E2E with visible browser
```

### Test Structure

```
src/
├── lib/__tests__/              # Unit tests for business logic
│   ├── workout-generator.test.ts
│   ├── workout-tools.test.ts
│   ├── workoutPlan.test.ts
│   └── timer-utils.test.ts
├── app/api/auth/register/__tests__/  # API route tests
│   └── route.test.ts
e2e/
├── fixtures/                   # Test helpers and fixtures
│   └── auth.fixture.ts
├── auth.spec.ts               # Authentication E2E tests
└── workout-flow.spec.ts       # Workout player E2E tests
```

### Writing Tests

**Unit Tests** (Vitest + Testing Library):
- Test pure business logic (timer calculations, workout generation)
- Mock external dependencies (database, OpenAI API)
- Place tests in `__tests__` directories next to source files
- Use `.test.ts` or `.test.tsx` extension

**E2E Tests** (Playwright):
- Test critical user flows (auth, onboarding, workout playback)
- Run against full application with real database
- Generate unique test users to avoid conflicts
- Use `test.skip` for tests that need specific prerequisites

### Mocking Strategies

**Database**: Mock `@/lib/db` query function in unit tests
```typescript
vi.mock('@/lib/db', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
}))
```

**OpenAI API**: Mock to avoid costs and ensure determinism
```typescript
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn().mockResolvedValue(mockResponse) } }
  }))
}))
```

**Next.js Navigation**: Mocked globally in vitest.setup.ts

### CI/CD

GitHub Actions runs tests on every push and PR:
1. **Unit tests**: Run first, fail fast
2. **Build**: Verify production build succeeds
3. **E2E tests**: Run against production build with PostgreSQL service

Test artifacts (screenshots, reports) uploaded on failure.

## Feature Development Workflow

A reusable workflow for implementing and releasing new product features.

### Phase 1: Planning

**1.1 Understand the Request**
- Clarify requirements with the user
- Use `Task` (Explore agent) to understand relevant codebase areas
- Identify files that need modification

**1.2 Create Implementation Plan**
- Write plan to plan file with files to modify, approach, and testing strategy
- Get user approval via `ExitPlanMode`

### Phase 2: Implementation

**2.1 Track Progress**
- Create todo list with `TodoWrite`
- Mark tasks in_progress/completed as you work

**2.2 Make Changes**
- Use `Edit`/`Write` tools to modify code
- Follow existing patterns in the codebase
- Keep changes minimal and focused

**2.3 Local Verification**
```bash
npm run lint      # Check for lint errors
npm run build     # Verify production build
```

### Phase 3: Testing

**3.1 Manual Testing with Playwright MCP**
```bash
npm run dev       # Start dev server
```

**Important: Always register a new test user first before testing the feature.**

1. Navigate to `/register` and create a new account
2. Then test the feature being built
3. Use Playwright MCP tools:
   - `mcp__playwright__browser_navigate` to open app
   - `mcp__playwright__browser_resize` for responsive testing
   - `mcp__playwright__browser_click` to interact
   - `mcp__playwright__browser_take_screenshot` to capture state

**3.2 Iterate on Feedback**
- Fix issues found during testing
- Re-test until feature works correctly

### Phase 4: PR Creation

**4.1 Run Tests**
```bash
npm run test:unit    # Unit tests
npm run test:e2e     # E2E tests (optional)
```

**4.2 Commit Changes**
```bash
git status
git diff --stat
git add <files>
git commit -m "feat: description

Details here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**4.3 Create Branch & Push**
```bash
git checkout -b feat/feature-name
git push -u origin feat/feature-name
```

**4.4 Create Pull Request**
```bash
gh pr create --title "feat: description" --body "$(cat <<'EOF'
## Summary
- Change 1
- Change 2

## Test plan
- [ ] Test case 1
- [ ] Test case 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Phase 5: CI/CD

**5.1 Wait for CI Checks (~3 minutes)**
```bash
gh pr checks <pr-number> --watch
```
- CI typically takes ~3 minutes (unit tests + E2E tests)
- Fix any failing checks before proceeding

### Phase 6: Code Review

Copilot review is triggered automatically when PR is created.

**6.1 Wait for Review**
```bash
gh pr view <pr-number> --comments
gh api repos/<owner>/<repo>/pulls/<pr-number>/reviews
```

**6.2 Address Feedback**

For each review comment:
1. Understand the concern
2. Make code changes
3. Test locally
4. Commit and push:
```bash
git add <files>
git commit -m "fix: address review feedback"
git push
```

**6.3 Re-run CI**
- Wait for checks to pass again (~3 minutes)
- Repeat until all feedback addressed

### Phase 7: Merge & Deploy

**7.1 Verify Merge Readiness**
```bash
gh pr view <pr-number> --json mergeable,mergeStateStatus
# Should show: "mergeStateStatus":"CLEAN","mergeable":"MERGEABLE"
```

**7.2 Merge PR**
```bash
gh pr merge <pr-number> --squash --delete-branch
```

**7.3 Update Local**
```bash
git checkout main && git pull
```

### Phase 8: Production Verification

**8.1 Wait for Deployment (~3 minutes)**
- Railway auto-deploys on merge to main
- Deployment typically takes ~3 minutes

**8.2 Review Deployment Logs**
```bash
railway logs                    # View recent logs
railway logs 2>&1 | head -100   # Check for errors
```

**If deployment fails or logs show errors:**
1. Identify root cause from logs
2. Create hotfix on new branch
3. Test fix locally
4. Fast-track PR and merge
5. Re-verify deployment

**8.3 Test Production with Playwright MCP**

**Important: Always register a new test user first before testing the feature.**

1. Navigate to https://fitstreak.app/register
2. Create a new test account
3. Then test the feature being built:
   - `mcp__playwright__browser_navigate` → production URL
   - `mcp__playwright__browser_snapshot` → verify page state
   - `mcp__playwright__browser_console_messages` → check for errors

### Phase 9: Documentation

**9.1 Update Docs (if needed)**
- Update `CLAUDE.md` with new patterns/learnings
- Commit and push documentation changes

### Workflow Quick Reference

**Iteration Loops:**
```
Plan → Implement → Test → Fix → Commit → CI → Review → Merge → Deploy → Verify
            ↑_____↓         ↑________↓
```

**Key Commands:**
| Action | Command |
|--------|---------|
| Lint | `npm run lint` |
| Build | `npm run build` |
| Unit tests | `npm run test:unit` |
| E2E tests | `npm run test:e2e` |
| Dev server | `npm run dev` |
| Watch CI | `gh pr checks <num> --watch` |
| Merge | `gh pr merge <num> --squash --delete-branch` |
| Deploy logs | `railway logs` |
