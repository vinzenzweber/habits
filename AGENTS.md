# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains Next.js route handlers, components, and pages. Media management logic lives under `src/app/admin/`, while shared UI lives in `src/components/`.
- `src/lib/` houses reusable domain logic (video metadata, database helpers).
- Static assets (e.g., public screenshots, icons, development videos) belong in `public/`.
- `scripts/` includes local tooling such as database bootstrap scripts.

## Build, Test, and Development Commands
- `npm run dev` — start the local Next.js dev server with hot reload.
- `npm run build` — create a production build (used by Railway deployments).
- `npm run lint` — run ESLint with the project configuration; fixes formatting issues early.

## Coding Style & Naming Conventions
- TypeScript throughout; prefer explicit types for exported functions.
- Use functional React components and `use client` directives only when interactivity is required.
- Database helpers live in `src/lib/*` and expose small, composable functions.
- Linting is enforced via ESLint (see `eslint.config.mjs`); follow existing import alias `@/` for src root.

## Testing Guidelines
- No automated test suite is configured yet; add Jest or Playwright under `src/tests/` if introducing tests.
- When adding tests, mirror directory structure of the code under test and suffix files with `.test.ts` or `.spec.ts`.

## Commit & Pull Request Guidelines
- Use short, imperative commit messages (e.g., "Add dropzone component", "Refine admin layout").
- Pull requests should describe functional changes, include screenshots for UI updates, and reference issue IDs when applicable.
- Ensure `npm run lint` and `npm run build` pass before requesting review.

## Security & Configuration Tips
- Local env vars live in `.env`; copy from `.env.example` and never commit secrets.
- For large uploads, ensure `NEXT_SERVER_ACTIONS_BODY_SIZE_LIMIT` is set appropriately (default 5gb).
