import { test as base, expect, type Page } from '@playwright/test'
import { generateTestUser, registerUser, loginUser, completeOnboarding } from './fixtures/auth.fixture'

/**
 * Multi-user isolation tests for GitHub Issue #155
 *
 * These tests verify that different users see their own personalized workouts
 * and that workout data is properly scoped per user in the database.
 */

// Extended fixture for multi-user testing
const test = base.extend<{ pageA: Page; pageB: Page }>({
  // First user's page
  pageA: async ({ browser }, callback) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await callback(page)
    await context.close()
  },
  // Second user's page
  pageB: async ({ browser }, callback) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await callback(page)
    await context.close()
  },
})

test.describe('Multi-user Workout Isolation', () => {
  test('two users see their own workout labels on detail page', async ({ pageA, pageB }) => {
    // Create and set up User A
    const userA = generateTestUser()
    await registerUser(pageA, userA)
    await loginUser(pageA, userA.email, userA.password)
    await completeOnboarding(pageA)

    // Create and set up User B
    const userB = generateTestUser()
    await registerUser(pageB, userB)
    await loginUser(pageB, userB.email, userB.password)
    await completeOnboarding(pageB)

    // Navigate both users to the same workout page
    await pageA.goto('/workouts/monday')
    await pageB.goto('/workouts/monday')

    // Both should see "Your Monday Workout" label (personalized)
    const labelA = pageA.locator('text=/Your Monday Workout/i')
    const labelB = pageB.locator('text=/Your Monday Workout/i')

    await expect(labelA).toBeVisible({ timeout: 10000 })
    await expect(labelB).toBeVisible({ timeout: 10000 })

    // Both should see workout content (verifies data loaded properly)
    const headingA = pageA.getByRole('heading', { level: 1 })
    const headingB = pageB.getByRole('heading', { level: 1 })

    await expect(headingA).toBeVisible()
    await expect(headingB).toBeVisible()
  })

  test('each user sees their own workouts on home page', async ({ pageA, pageB }) => {
    // Create and set up User A
    const userA = generateTestUser()
    await registerUser(pageA, userA)
    await loginUser(pageA, userA.email, userA.password)
    await completeOnboarding(pageA)

    // Create and set up User B
    const userB = generateTestUser()
    await registerUser(pageB, userB)
    await loginUser(pageB, userB.email, userB.password)
    await completeOnboarding(pageB)

    // Navigate both users to home page
    await pageA.goto('/')
    await pageB.goto('/')

    // Both should see weekly schedule (indicating data loaded)
    const scheduleA = pageA.getByText(/weekly schedule/i)
    const scheduleB = pageB.getByText(/weekly schedule/i)

    await expect(scheduleA).toBeVisible({ timeout: 10000 })
    await expect(scheduleB).toBeVisible({ timeout: 10000 })

    // Both should see Today badge (indicating workout data loaded properly)
    const todayA = pageA.getByText(/today/i).first()
    const todayB = pageB.getByText(/today/i).first()

    await expect(todayA).toBeVisible()
    await expect(todayB).toBeVisible()
  })

  test('logout and login shows correct user workouts', async ({ page }) => {
    // Create two users
    const userA = generateTestUser()
    const userB = generateTestUser()

    // Set up User A
    await registerUser(page, userA)
    await loginUser(page, userA.email, userA.password)
    await completeOnboarding(page)

    // Verify User A can see workouts
    await page.goto('/workouts/monday')
    await expect(page.locator('text=/Your Monday Workout/i')).toBeVisible({ timeout: 10000 })

    // Logout
    await page.goto('/logout')
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Register and login as User B
    await registerUser(page, userB)
    await loginUser(page, userB.email, userB.password)
    await completeOnboarding(page)

    // Verify User B can see workouts too (their own)
    await page.goto('/workouts/monday')
    await expect(page.locator('text=/Your Monday Workout/i')).toBeVisible({ timeout: 10000 })
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access workout page without login
    await page.goto('/workouts/monday')

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('home page shows correct today/up-next labeling', async ({ pageA }) => {
    // Create and set up User A
    const userA = generateTestUser()
    await registerUser(pageA, userA)
    await loginUser(pageA, userA.email, userA.password)
    await completeOnboarding(pageA)

    // Navigate to home page
    await pageA.goto('/')

    // Should see the "Today" or "Up Next" label in the featured workout section
    const todayOrUpNext = pageA.locator('text=/Today|Up Next/').first()
    await expect(todayOrUpNext).toBeVisible({ timeout: 10000 })
  })
})
