import { test as base, expect, type Page } from '@playwright/test'

// Generate unique test user credentials
function generateTestUser() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return {
    email: `e2e-${timestamp}-${random}@habits.local`,
    password: 'TestPassword123!',
    name: 'E2E Test User'
  }
}

// Extended test fixture with authenticated page options
type AuthFixtures = {
  // Page with a freshly registered user (on onboarding)
  newUserPage: Page
  // Page with completed onboarding (can access home/workouts)
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  // Fresh user that just registered - will be on onboarding page
  newUserPage: async ({ page }, use) => {
    const user = generateTestUser()
    await registerUser(page, user)
    await loginUser(page, user.email, user.password)
    await use(page)
  },

  // User with completed onboarding - can access all pages
  authenticatedPage: async ({ page }, use) => {
    const user = generateTestUser()
    await registerUser(page, user)
    await loginUser(page, user.email, user.password)
    await completeOnboarding(page)
    await use(page)
  },
})

// Re-export expect
export { expect }

// Helper to register a new user
async function registerUser(
  page: Page,
  user: { email: string; password: string; name: string }
) {
  await page.goto('/register')

  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/password/i).fill(user.password)

  const nameField = page.getByLabel(/name/i)
  if (await nameField.isVisible()) {
    await nameField.fill(user.name)
  }

  await page.getByRole('button', { name: /register/i }).click()

  // Wait for registration to complete
  await expect(page).toHaveURL(/\/(login|onboarding|\/)/, { timeout: 15000 })
}

// Helper to login
async function loginUser(page: Page, email: string, password: string) {
  // If already logged in (redirected to onboarding), skip login
  if (page.url().includes('/onboarding')) {
    return
  }

  // If not on login page, navigate there
  if (!page.url().includes('/login')) {
    await page.goto('/login')
  }

  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /login/i }).click()

  // Wait for redirect to onboarding (new users) or home (existing users)
  await expect(page).toHaveURL(/\/(onboarding|\/)/, { timeout: 15000 })

  // Extra wait for page to fully load
  await page.waitForLoadState('networkidle')
}

// Helper to complete onboarding via test API
async function completeOnboarding(page: Page) {
  // Ensure we're on a page where we can make authenticated requests
  // Navigate to onboarding page first if not there
  if (!page.url().includes('/onboarding')) {
    await page.goto('/onboarding')
  }

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')

  // Call the test API to complete onboarding using page.evaluate
  // This ensures the request uses the browser's cookies
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/test/complete-onboarding', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    return { ok: response.ok, status: response.status, data }
  })

  if (!result.ok) {
    throw new Error(`Failed to complete onboarding (${result.status}): ${JSON.stringify(result.data)}`)
  }

  // Set the onboarding cookie (in case JWT isn't updated yet)
  await page.context().addCookies([{
    name: 'onboarding_complete',
    value: 'true',
    domain: 'localhost',
    path: '/',
  }])

  // Navigate to home page
  await page.goto('/')

  // Verify we're on home page, not onboarding
  await expect(page).toHaveURL('/', { timeout: 5000 })
}

// Export helpers for custom usage
export { generateTestUser, registerUser, loginUser, completeOnboarding }
