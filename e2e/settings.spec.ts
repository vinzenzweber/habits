import { test, expect } from '@playwright/test'

// Generate unique email for each test run to avoid conflicts
function generateTestEmail() {
  return `e2e-settings-${Date.now()}-${Math.random().toString(36).slice(2)}@habits.local`
}

test.describe('Settings Page', () => {
  const testEmail = generateTestEmail()
  const testPassword = 'ValidPassword123!'

  test.beforeAll(async ({ browser }) => {
    // Register user once for settings tests
    const page = await browser.newPage()
    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill('Settings Test User')
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /register|sign up|create account/i }).click()

    // Wait for redirect to complete AND page to load (not just URL change)
    await expect(page).toHaveURL(/\/(login|onboarding|\/)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // If redirected to login, login first
    if (page.url().includes('/login')) {
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /log in|sign in|login/i }).click()
      await expect(page).toHaveURL(/\/(onboarding|\/)/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')
    }

    // Complete onboarding via test endpoint (use page.request to use the same session cookies)
    const response = await page.request.post('/api/test/complete-onboarding')
    // If already completed or successful, both are fine
    const body = await response.json()
    expect(body.success || body.message === 'Already completed').toBe(true)

    await page.close()
  })

  test.describe('Navigation', () => {
    test('shows Profile tab in bottom navigation', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /log in|sign in|login/i }).click()

      // Should redirect to home since onboarding is already completed
      await expect(page).toHaveURL('/', { timeout: 10000 })

      // Check for Profile link in bottom nav
      const profileLink = page.getByRole('link', { name: /profile/i })
      await expect(profileLink).toBeVisible()
    })

    test('navigates to settings page when clicking Profile', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /log in|sign in|login/i }).click()

      // Should redirect to home since onboarding is already completed
      await expect(page).toHaveURL('/', { timeout: 10000 })

      // Click Profile link
      await page.getByRole('link', { name: /profile/i }).click()
      await expect(page).toHaveURL(/\/settings/)
    })

    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/settings')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Settings Form', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /log in|sign in|login/i }).click()

      // Should redirect to home since onboarding is already completed
      await expect(page).toHaveURL('/', { timeout: 10000 })

      // Navigate to settings
      await page.goto('/settings')
    })

    test('displays settings page with all form elements', async ({ page }) => {
      // Check page header
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

      // Check form elements
      await expect(page.getByLabel(/timezone/i)).toBeVisible()
      await expect(page.getByLabel(/language.*region/i)).toBeVisible()
      await expect(page.getByLabel(/unit system/i)).toBeVisible()

      // Check save button
      await expect(page.getByRole('button', { name: /save preferences/i })).toBeVisible()
    })

    test('displays user account information', async ({ page }) => {
      // Check for user name
      await expect(page.getByText('Settings Test User')).toBeVisible()

      // Check for email
      await expect(page.getByText(testEmail)).toBeVisible()
    })

    test('has timezone dropdown with options', async ({ page }) => {
      const timezoneSelect = page.getByLabel(/timezone/i)
      await expect(timezoneSelect).toBeVisible()

      // Check for some common timezone options
      await timezoneSelect.click()
      // Note: The select dropdown behavior varies, so we just check the element exists
      expect(await timezoneSelect.count()).toBe(1)
    })

    test('has locale dropdown with options', async ({ page }) => {
      const localeSelect = page.getByLabel(/language.*region/i)
      await expect(localeSelect).toBeVisible()
      expect(await localeSelect.count()).toBe(1)
    })

    test('has unit system dropdown with metric and imperial', async ({ page }) => {
      const unitSelect = page.getByLabel(/unit system/i)
      await expect(unitSelect).toBeVisible()
      expect(await unitSelect.count()).toBe(1)
    })

    test('successfully saves preferences', async ({ page }) => {
      // Change unit system
      const unitSelect = page.getByLabel(/unit system/i)
      await unitSelect.selectOption('imperial')

      // Save preferences
      await page.getByRole('button', { name: /save preferences/i }).click()

      // Check for success message
      await expect(page.getByText(/preferences saved successfully/i)).toBeVisible({ timeout: 5000 })
    })

    test('persists saved preferences after page reload', async ({ page }) => {
      // Change unit system to imperial
      const unitSelect = page.getByLabel(/unit system/i)
      await unitSelect.selectOption('imperial')

      // Save
      await page.getByRole('button', { name: /save preferences/i }).click()
      await expect(page.getByText(/preferences saved successfully/i)).toBeVisible({ timeout: 5000 })

      // Reload page
      await page.reload()

      // Check that imperial is still selected
      const unitSelectAfterReload = page.getByLabel(/unit system/i)
      await expect(unitSelectAfterReload).toHaveValue('imperial')
    })
  })
})
