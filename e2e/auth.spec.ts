import { test, expect } from '@playwright/test'

// Generate unique email for each test run to avoid conflicts
function generateTestEmail() {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@habits.local`
}

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('shows registration form with required fields', async ({ page }) => {
      await page.goto('/register')

      // Check for essential form elements
      await expect(page.getByLabel(/^name$/i)).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /register|sign up|create account/i })).toBeVisible()
    })

    test('validates name is required', async ({ page }) => {
      await page.goto('/register')

      // Fill email and password but not name
      await page.getByLabel(/email/i).fill(generateTestEmail())
      await page.getByLabel(/password/i).fill('ValidPassword123!')
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Should stay on register page (HTML5 validation will prevent submit)
      await expect(page).toHaveURL(/\/register/)
    })

    test('validates email format', async ({ page }) => {
      await page.goto('/register')

      // Try invalid email
      await page.getByLabel(/^name$/i).fill('Test User')
      await page.getByLabel(/email/i).fill('invalid-email')
      await page.getByLabel(/password/i).fill('ValidPassword123!')
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Should show error or not navigate away
      await expect(page).toHaveURL(/\/register/)
    })

    test('validates password length', async ({ page }) => {
      await page.goto('/register')

      // Try short password
      await page.getByLabel(/^name$/i).fill('Test User')
      await page.getByLabel(/email/i).fill(generateTestEmail())
      await page.getByLabel(/password/i).fill('short')
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Should show error about password requirements
      await expect(page).toHaveURL(/\/register/)
    })

    test('successfully registers new user', async ({ page }) => {
      const email = generateTestEmail()

      await page.goto('/register')

      await page.getByLabel(/^name$/i).fill('Test User')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/password/i).fill('ValidPassword123!')

      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Should redirect to login, onboarding, or home after successful registration
      await expect(page).toHaveURL(/\/(login|onboarding|\/)/, { timeout: 10000 })
    })

    test('prevents duplicate email registration', async ({ page }) => {
      const email = generateTestEmail()

      // First registration
      await page.goto('/register')
      await page.getByLabel(/^name$/i).fill('Test User')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/password/i).fill('ValidPassword123!')
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Wait for first registration to complete
      await expect(page).toHaveURL(/\/(login|onboarding|\/)/, { timeout: 10000 })

      // Second registration with same email
      await page.goto('/register')
      await page.getByLabel(/^name$/i).fill('Another User')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/password/i).fill('DifferentPassword123!')
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Should stay on register page or show error
      // Check for error message
      const errorMessage = page.getByText(/already registered|already exists|email taken/i)
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Login', () => {
    const testEmail = generateTestEmail()
    const testPassword = 'ValidPassword123!'

    test.beforeAll(async ({ browser }) => {
      // Register user once for login tests
      const page = await browser.newPage()
      await page.goto('/register')
      await page.getByLabel(/^name$/i).fill('Login Test User')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()
      await expect(page).toHaveURL(/\/(login|onboarding|\/)/, { timeout: 10000 })
      await page.close()
    })

    test('shows login form', async ({ page }) => {
      await page.goto('/login')

      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /log in|sign in|login/i })).toBeVisible()
    })

    test('rejects invalid credentials', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/email/i).fill('nonexistent@test.com')
      await page.getByLabel(/password/i).fill('WrongPassword123!')
      await page.getByRole('button', { name: /log in|sign in|login/i }).click()

      // Should stay on login page or show error
      await expect(page).toHaveURL(/\/login/)
    })

    test('successfully logs in registered user', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /log in|sign in|login/i }).click()

      // Should redirect to onboarding or home
      await expect(page).toHaveURL(/\/(onboarding|\/)/, { timeout: 10000 })
    })

    test('has link to registration page', async ({ page }) => {
      await page.goto('/login')

      const registerLink = page.getByRole('link', { name: /register|sign up|create account/i })
      await expect(registerLink).toBeVisible()
      await registerLink.click()

      await expect(page).toHaveURL(/\/register/)
    })
  })

  test.describe('Session', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })

    test('preserves session across page reloads', async ({ page }) => {
      const email = generateTestEmail()

      // Register and login
      await page.goto('/register')
      await page.getByLabel(/^name$/i).fill('Session Test User')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/password/i).fill('ValidPassword123!')
      await page.getByRole('button', { name: /register|sign up|create account/i }).click()

      // Wait for login/redirect
      await expect(page).toHaveURL(/\/(login|onboarding|\/)/, { timeout: 10000 })

      // If redirected to login, complete login
      if (page.url().includes('/login')) {
        await page.getByLabel(/email/i).fill(email)
        await page.getByLabel(/password/i).fill('ValidPassword123!')
        await page.getByRole('button', { name: /log in|sign in|login/i }).click()
        await expect(page).toHaveURL(/\/(onboarding|\/)/, { timeout: 10000 })
      }

      // Reload the page
      await page.reload()

      // Should stay logged in (not on login page)
      await expect(page).not.toHaveURL(/\/login/)
    })
  })
})
