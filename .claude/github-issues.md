# FitStreak GitHub Issues

> Fetched on: 2026-01-25
> Total Open Issues: 44

---

## Epic: Grocery Products Scraper (Playwright + SideQuest)
**Issue #290** | Created: 2026-01-20 | Priority: P3-future | Labels: enhancement, backend

### Overview
Scrape grocery products from Gurkerl.at, Billa.at, and other shops using Playwright, running via SideQuest jobs.

### Problem Statement
No product scraping pipeline exists for online grocery sources.

### Solution
Introduce Playwright scrapers, SideQuest jobs, and storage for product data.

### Sub-Issues (6)

#### #284 - Grocery Scraper: Add data model for products + price snapshots
**Labels:** enhancement, database, backend, P3-future

Define the data model for imported grocery products and store scraped metadata.

**Acceptance Criteria:**
- [ ] Tables exist for product sources, products, and price snapshots
- [ ] Each product records source URL and source identifier
- [ ] Migration is reversible

---

#### #285 - Grocery Scraper: Playwright parser for Gurkerl.at
**Labels:** enhancement, backend, P3-future

Implement Playwright-based scraper helpers for Gurkerl.at product listing pages.

**Acceptance Criteria:**
- [ ] Playwright fetches and parses product listings
- [ ] Extracts name, price, unit size, image URL, and product URL
- [ ] Handles pagination or "load more"

---

#### #286 - Grocery Scraper: Playwright parser for Billa.at
**Labels:** enhancement, backend, P3-future

Implement Playwright-based scraper helpers for Billa.at product listing pages.

**Acceptance Criteria:**
- [ ] Playwright fetches and parses product listings
- [ ] Extracts name, price, unit size, image URL, and product URL
- [ ] Handles pagination or "load more"

---

#### #287 - Grocery Scraper: SideQuest job to run Playwright scrapers
**Labels:** enhancement, backend, P3-future

Create a SideQuest job that runs the Playwright scrapers and stores results.

**Acceptance Criteria:**
- [ ] Job runs scraper for configured sources
- [ ] Results are persisted to database
- [ ] Failures are retried with backoff

---

#### #288 - Grocery Scraper: Admin API to trigger scraping jobs
**Labels:** enhancement, backend, api, P3-future

Add an admin API to trigger or schedule grocery scraping jobs.

**Acceptance Criteria:**
- [ ] Admin endpoint enqueues SideQuest job
- [ ] Endpoint requires admin auth token
- [ ] Returns job ID and status

---

#### #289 - Grocery Scraper: Rate limiting + error logging
**Labels:** enhancement, backend, P3-future

Add basic observability and guardrails for scraping (rate limits, robots, failures).

**Acceptance Criteria:**
- [ ] Configurable per-site delay between requests
- [ ] Rate limit/backoff handling for 429/blocked responses
- [ ] Errors logged with source URL and failure reason

---

## Epic: Whoop Integration
**Issue #279** | Created: 2026-01-20 | Priority: P3-future | Labels: enhancement, backend, api

### Overview
Integrate WHOOP to import recovery, sleep, workout, cycle, profile, and body measurement data and surface it in the app.

### Problem Statement
No WHOOP connection or data ingestion exists.

### Solution
Implement OAuth, full data import (profile/body + time series), sync/backfill jobs, and UI display.

### Sub-Issues (5)

#### #268 - Whoop: OAuth connect flow + token storage
**Labels:** enhancement, backend, api, P3-future

Implement the WHOOP OAuth 2.0 authorization code flow and persist tokens for full data access.

**Acceptance Criteria:**
- [ ] OAuth uses Authorization URL `https://api.prod.whoop.com/oauth/oauth2/auth` and Token URL `https://api.prod.whoop.com/oauth/oauth2/token`
- [ ] Requested scopes include: `read:recovery`, `read:cycles`, `read:sleep`, `read:workout`, `read:profile`, `read:body_measurement`
- [ ] If long-lived access is needed, request `offline` scope and store refresh token
- [ ] Access and refresh tokens are stored securely and scoped per user
- [ ] Disconnect flow revokes access via `DELETE /v2/user/access`

---

#### #269 - Whoop: Scheduled data sync (cycles, recovery, sleep, workouts)
**Labels:** enhancement, backend, P3-future

Sync each user's WHOOP data on a schedule (cycles, recovery, sleep, workouts).

**Acceptance Criteria:**
- [ ] Cycles fetched via `GET /v2/cycle` with `start/end/nextToken` pagination
- [ ] Recoveries fetched via `GET /v2/recovery` with `start/end/nextToken` pagination
- [ ] Sleeps fetched via `GET /v2/activity/sleep` with `start/end/nextToken` pagination
- [ ] Workouts fetched via `GET /v2/activity/workout` with `start/end/nextToken` pagination
- [ ] Handles `score_state` values (`SCORED`, `PENDING_SCORE`, `UNSCORABLE`) without failing
- [ ] 429 rate-limit responses are handled with backoff/retry

---

#### #270 - Whoop: Show recovery data on home screen
**Labels:** enhancement, frontend, ui, P3-future

Display WHOOP recovery data on the home screen when available.

**Acceptance Criteria:**
- [ ] If `score_state` is `SCORED`, show recovery score (0–100) and key metrics (RHR, HRV)
- [ ] If `score_state` is `PENDING_SCORE`, show a "pending score" state
- [ ] If `score_state` is `UNSCORABLE`, show a "no score available" state
- [ ] If `user_calibrating` is true, show a "calibrating" hint
- [ ] UI hides gracefully when no recovery data exists

---

#### #281 - Whoop: Import user profile + body measurements
**Labels:** enhancement, backend, api, P3-future

Import WHOOP user profile and body measurements.

**Acceptance Criteria:**
- [ ] Profile fetched via `GET /v2/user/profile/basic`
- [ ] Body measurements fetched via `GET /v2/user/measurement/body`
- [ ] Data stored per user and updated on connect (and on-demand refresh)

---

#### #282 - Whoop: Historical data backfill (cycles, recovery, sleep, workouts)
**Labels:** enhancement, backend, P3-future

Backfill historical WHOOP data for new connections.

**Acceptance Criteria:**
- [ ] Backfill cycles via `GET /v2/cycle` with pagination
- [ ] Backfill recoveries via `GET /v2/recovery` with pagination
- [ ] Backfill sleeps via `GET /v2/activity/sleep` with pagination
- [ ] Backfill workouts via `GET /v2/activity/workout` with pagination
- [ ] Backfill can be limited by configurable start date and max pages

---

## Epic: Workouts & Exercises Navigation
**Issue #280** | Created: 2026-01-20 | Priority: P1-core | Labels: enhancement, frontend, ui

### Overview
Add a dedicated navigation path and pages to browse workouts and exercises.

### Problem Statement
Workouts and exercises are not discoverable via navigation.

### Solution
Add a nav tab and build read-only list pages.

### Sub-Issues (3)

#### #271 - Navigation: Add Workouts & Exercises tab
**Labels:** enhancement, frontend, ui, P1-core

Add a new bottom navigation tab for Workouts & Exercises.

**Acceptance Criteria:**
- [ ] Tab is visible in bottom nav
- [ ] Tab navigates to the new list page

---

#### #272 - Workouts: List page (read-only)
**Labels:** enhancement, frontend, ui, P1-core

Create a read-only workouts list page.

**Acceptance Criteria:**
- [ ] Page lists all workouts
- [ ] Each item links to its workout detail

---

#### #273 - Exercises: List page with search
**Labels:** enhancement, frontend, ui, P1-core

Create a read-only exercises list page with basic search.

**Acceptance Criteria:**
- [ ] Exercises list loads and displays names
- [ ] Search filters list client-side

---

## Epic: Product Marketing Page
**Issue #278** | Created: 2026-01-20 | Priority: P2-enhancement | Labels: enhancement, frontend, ui

### Overview
Create a public marketing page that describes FitStreak features.

### Problem Statement
No public-facing marketing page exists.

### Solution
Add a route and populate with feature sections and CTA.

### Sub-Issues (2)

#### #266 - Marketing: Add public marketing page route
**Labels:** enhancement, frontend, ui, P2-enhancement

Create a public marketing page route with basic layout.

**Acceptance Criteria:**
- [ ] Route renders without auth
- [ ] Page uses existing layout/header/footer where appropriate

---

#### #267 - Marketing: Feature sections + CTA
**Labels:** enhancement, frontend, ui, P2-enhancement

Add feature sections and CTA content to the marketing page.

**Acceptance Criteria:**
- [ ] Feature sections are visible and responsive
- [ ] CTA links to /register

---

## Epic: Deep Research Agent
**Issue #277** | Created: 2026-01-20 | Priority: P3-future | Labels: enhancement, ai

### Overview
Lay the groundwork for a deep research agent for workouts and health questions.

### Problem Statement
No endpoint or UI path exists for deep research requests.

### Solution
Add a minimal API scaffold and UI command integration.

### Sub-Issues (2)

#### #264 - Deep Research: API route scaffold
**Labels:** enhancement, backend, ai, api, P3-future

Add a scaffold API route for the deep research agent.

**Acceptance Criteria:**
- [ ] API route validates input
- [ ] Returns a placeholder response without errors

---

#### #265 - Deep Research: Chat command integration
**Labels:** enhancement, frontend, ai, P3-future

Wire a chat command or UI entry to call the deep research API.

**Acceptance Criteria:**
- [ ] UI command triggers API call
- [ ] Response is rendered in chat

---

## Epic: AI Meal Planning (Multi-Person)
**Issue #276** | Created: 2026-01-20 | Priority: P1-core | Labels: enhancement, ai, recipes

### Overview
Add multi-person support for AI-assisted meal planning.

### Problem Statement
Meal planning assumes a single profile and lacks household member management.

### Solution
Introduce household member data, APIs, and UI selection for plan generation.

### Sub-Issues (5)

#### #259 - Meal Planning: Add household members tables
**Labels:** enhancement, database, backend, P1-core, recipes

Add data tables for household members to support multi-person meal planning.

**Acceptance Criteria:**
- [ ] New table(s) created for household members
- [ ] Basic fields include name and dietary preferences
- [ ] Migration is reversible

---

#### #260 - Meal Planning: Household members CRUD API
**Labels:** enhancement, backend, api, P1-core, recipes

Add API endpoints and helpers to manage household members.

**Acceptance Criteria:**
- [ ] CRUD endpoints exist for household members
- [ ] Requests are user-scoped
- [ ] Basic validation is enforced

---

#### #261 - Meal Planning: Multi-person input for AI plan generation
**Labels:** enhancement, backend, ai, P1-core, recipes

Allow meal plan generation to accept multiple household members.

**Acceptance Criteria:**
- [ ] API accepts an array of household members
- [ ] Prompt includes each member's preferences
- [ ] Backwards-compatible with single member input

---

#### #262 - Meal Planning UI: Select household members
**Labels:** enhancement, frontend, ui, P1-core, recipes

Add UI controls to select which household members are included in a meal plan.

**Acceptance Criteria:**
- [ ] UI lists household members with selection controls
- [ ] Selection is sent to the plan generation endpoint
- [ ] UI handles empty member lists gracefully

---

#### #263 - Meal Planning UI: Manage household members
**Labels:** enhancement, frontend, ui, P1-core, recipes

Create a simple UI for managing household members.

**Acceptance Criteria:**
- [ ] Users can create, edit, and delete members
- [ ] Changes persist via API
- [ ] Errors are surfaced clearly

---

## Epic: SideQuest Unified Background Tasks
**Issue #275** | Created: 2026-01-20 | Priority: P1-core | Labels: enhancement, backend

### Overview
Unify background task handling with SideQuest for current and future async workloads.

### Problem Statement
Background tasks are fragmented or missing for upcoming features.

### Solution
Standardize on SideQuest jobs with clear queue registration and worker execution.

### Sub-Issues (5)

#### #254 - SideQuest: Refactor exercise image generation into job
**Labels:** enhancement, backend, ai, P1-core

Move exercise image generation into a SideQuest job so it can be processed asynchronously and reliably.

**Acceptance Criteria:**
- [ ] Image generation is queued via SideQuest
- [ ] Worker processes jobs and persists images as before
- [ ] Legacy synchronous path is removed or unused

---

#### #255 - SideQuest: Scaffold job for recipe/meal-plan agent
**Labels:** enhancement, backend, ai, P3-future, recipes

Add a placeholder SideQuest job for a future recipe + meal planning AI agent.

**Acceptance Criteria:**
- [ ] Job class is registered with SideQuest
- [ ] Job can be enqueued and executes a no-op without errors

---

#### #256 - SideQuest: Scaffold job for deep research agent
**Labels:** enhancement, backend, ai, P3-future

Add a placeholder SideQuest job for the future deep research agent.

**Acceptance Criteria:**
- [ ] Job class is registered with SideQuest
- [ ] Job can be enqueued and executes a no-op without errors

---

#### #257 - SideQuest: Scaffold job for groceries scraper
**Labels:** enhancement, backend, P3-future

Add a placeholder SideQuest job for a future groceries scraper.

**Acceptance Criteria:**
- [ ] Job class is registered with SideQuest
- [ ] Job can be enqueued and executes a no-op without errors

---

#### #258 - SideQuest: Scaffold job for shopping assistant
**Labels:** enhancement, backend, P3-future

Add a placeholder SideQuest job for a future shopping assistant.

**Acceptance Criteria:**
- [ ] Job class is registered with SideQuest
- [ ] Job can be enqueued and executes a no-op without errors

---

## Epic: Desktop UI (Progressive Layout)
**Issue #274** | Created: 2026-01-20 | Priority: P0-foundation | Labels: enhancement, frontend, ui

### Overview
Progressive desktop layout improvements for the recipes experience.

### Problem Statement
Desktop layouts are not optimized for larger screens and show fewer items than necessary.

### Solution
Introduce desktop-specific grid and density tweaks while keeping mobile layouts unchanged.

### Sub-Issues (2)

#### #252 - (Completed in scope)
Desktop 4-column grid for recipes.

#### #253 - (Completed in scope)
Reduce desktop collection item size for higher information density.

---

## Epic: Refactor PDF Recipe Import with Background Job Processing
**Issue #224** | Created: 2026-01-19 | Priority: P1-core | Labels: enhancement, recipes

### Overview
Refactor PDF recipe import from synchronous blocking operation to asynchronous background job processing using SideQuest.js. This eliminates timeout risks, enables real-time progress tracking, and provides better UX for multi-page PDFs.

### Problem Statement
- API blocks for entire PDF extraction (7-13 seconds/page × N pages)
- Timeout risk on PDFs with >5-6 pages (Railway 60s timeout)
- No progress indication - user stares at spinner
- No partial results - all-or-nothing extraction
- No error recovery for individual page failures

### Solution
- Background job processing with SideQuest.js on PostgreSQL
- Immediate API response with job ID
- Real-time progress polling every 2 seconds
- Partial results as recipes complete
- Better error recovery (failed pages don't fail entire job)

### Architecture
```
User uploads PDF
  ↓
POST /api/recipes/extract-from-pdf → Returns job ID (HTTP 202)
  ↓
ProcessPdfJob (Queue: pdf-processing, Concurrency: 1)
  ↓
Renders each page → Spawns ExtractRecipeFromImageJob for each page
  ↓
ExtractRecipeFromImageJob × N (Queue: recipe-extraction, Concurrency: 3)
  ↓
Vision API extraction → Save recipe → Update progress
  ↓
UI polls GET /api/recipes/extract-from-pdf/[jobId] → Shows live progress
```

### Sub-Issues (Partially Listed - 12 total)

#### #233 - Add cancel functionality to UI
**Labels:** enhancement, frontend, ui, P1-core

Add cancel button to UI that allows users to cancel running PDF extraction jobs.

**Acceptance Criteria:**
- [ ] Cancel button appears during extraction
- [ ] Clicking cancel calls DELETE endpoint
- [ ] Job stops processing (no more updates)
- [ ] UI resets to initial state after cancel
- [ ] Error handling for cancel failures
- [ ] Button disabled during cancellation
- [ ] Clear visual feedback (spinner, disabled state)

---

#### #235 - Write E2E tests for async PDF extraction flow
**Labels:** enhancement, frontend, P1-core

Write end-to-end tests using Playwright to verify the complete async PDF extraction flow.

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] Tests cover happy path and error cases
- [ ] Tests run in <5 minutes
- [ ] No flaky tests
- [ ] Test fixtures committed to repo

---

