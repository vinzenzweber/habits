# FitStreak Product Features Overview

> Compact view of all planned features (44 open issues)
> Last updated: 2026-01-25

---

## Priority Legend
| Priority | Description |
|----------|-------------|
| **P0** | Foundation - Must complete first |
| **P1** | Core - Essential for MVP |
| **P2** | Enhancement - Nice to have |
| **P3** | Future - Planned for later |

---

## 🏋️ Workouts & Exercises

### Navigation & Discovery (P1) - Epic #280
Add dedicated navigation for browsing workouts and exercises.

| # | Feature | Status |
|---|---------|--------|
| 271 | Add Workouts & Exercises tab to bottom nav | Pending |
| 272 | Workouts list page (read-only) | Pending |
| 273 | Exercises list page with search | Pending |

---

## 🍳 Recipes & Meal Planning

### PDF Import Async Processing (P1) - Epic #224
Background job processing for PDF recipe extraction with progress tracking.

| # | Feature | Status |
|---|---------|--------|
| 233 | Cancel button for PDF extraction | Blocked |
| 235 | E2E tests for async PDF flow | Pending |

### Multi-Person Meal Planning (P1) - Epic #276
AI meal planning for households with multiple people.

| # | Feature | Status |
|---|---------|--------|
| 259 | Household members database tables | Pending |
| 260 | Household members CRUD API | Pending |
| 261 | Multi-person AI plan generation | Pending |
| 262 | UI: Select household members | Pending |
| 263 | UI: Manage household members | Pending |

---

## 🛒 Grocery & Shopping

### Grocery Product Scraper (P3) - Epic #290
Scrape product data from Gurkerl.at, Billa.at via Playwright + SideQuest.

| # | Feature | Status |
|---|---------|--------|
| 284 | Products + price snapshots data model | Pending |
| 285 | Playwright parser: Gurkerl.at | Pending |
| 286 | Playwright parser: Billa.at | Pending |
| 287 | SideQuest job for scrapers | Pending |
| 288 | Admin API to trigger scraping | Pending |
| 289 | Rate limiting + error logging | Pending |

---

## ⌚ Integrations

### WHOOP Integration (P3) - Epic #279
Import recovery, sleep, workout data from WHOOP wearables.

| # | Feature | Status |
|---|---------|--------|
| 268 | OAuth connect flow + token storage | Pending |
| 269 | Scheduled data sync (cycles, recovery, sleep) | Pending |
| 270 | Show recovery data on home screen | Pending |
| 281 | Import user profile + body measurements | Pending |
| 282 | Historical data backfill | Pending |

---

## 🤖 AI Features

### Deep Research Agent (P3) - Epic #277
AI agent for in-depth workout and health research.

| # | Feature | Status |
|---|---------|--------|
| 264 | API route scaffold | Pending |
| 265 | Chat command integration | Pending |

---

## ⚙️ Infrastructure

### SideQuest Background Tasks (P1) - Epic #275
Unified async job processing via SideQuest.js.

| # | Feature | Status |
|---|---------|--------|
| 254 | Refactor exercise image generation into job | Pending |
| 255 | Scaffold: Recipe/meal-plan agent job | Pending |
| 256 | Scaffold: Deep research agent job | Pending |
| 257 | Scaffold: Groceries scraper job | Pending |
| 258 | Scaffold: Shopping assistant job | Pending |

### Desktop UI Improvements (P0) - Epic #274
Progressive layout optimizations for larger screens.

| # | Feature | Status |
|---|---------|--------|
| 252 | 4-column recipe grid on desktop | ✅ Done |
| 253 | Reduce collection item size for density | ✅ Done |

---

## 📣 Marketing

### Product Marketing Page (P2) - Epic #278
Public-facing page describing FitStreak features.

| # | Feature | Status |
|---|---------|--------|
| 266 | Add public marketing page route | Pending |
| 267 | Feature sections + CTA | Pending |

---

## Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 2 | Desktop UI (done) |
| P1 | 16 | Navigation, Meal Planning, PDF Import, SideQuest |
| P2 | 2 | Marketing Page |
| P3 | 22 | WHOOP, Grocery Scraper, Deep Research |

**Total Open Issues: 44**

---

## Quick Reference: Epics

| Epic | # | Priority | Issues |
|------|---|----------|--------|
| Desktop UI | 274 | P0 | 2 (done) |
| PDF Import Async | 224 | P1 | 12 |
| SideQuest Tasks | 275 | P1 | 5 |
| Meal Planning | 276 | P1 | 5 |
| Workouts Nav | 280 | P1 | 3 |
| Marketing Page | 278 | P2 | 2 |
| Deep Research | 277 | P3 | 2 |
| WHOOP | 279 | P3 | 5 |
| Grocery Scraper | 290 | P3 | 6 |
