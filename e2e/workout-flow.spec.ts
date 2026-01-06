import { test, expect } from './fixtures/auth.fixture'

test.describe('Workout Flow', () => {
  test.describe('Home Page', () => {
    test('displays weekly workout schedule', async ({ authenticatedPage: page }) => {
      // User has completed onboarding, should be on home page
      await expect(page).toHaveURL('/')

      // Check for weekly schedule section
      const weeklySchedule = page.getByText(/weekly schedule/i)
      await expect(weeklySchedule).toBeVisible({ timeout: 10000 })

      // Should show day labels (Monday, Tuesday, etc.)
      const mondayLabel = page.getByText(/monday/i).first()
      await expect(mondayLabel).toBeVisible()
    })

    test('shows today\'s workout highlighted', async ({ authenticatedPage: page }) => {
      await expect(page).toHaveURL('/')

      // The home page should highlight today's workout with "TODAY" badge
      const todayBadge = page.getByText(/today/i).first()
      await expect(todayBadge).toBeVisible({ timeout: 10000 })

      // Should show motivational header (time-based dynamic messaging)
      // Matches patterns like "Morning momentum", "Start your day", "Beat the evening slump", etc.
      const motivationalHeader = page.getByText(/momentum|start your day|midday|afternoon|end your day|still time|perfect time|energy boost|beat.*slump/i).first()
      await expect(motivationalHeader).toBeVisible()
    })
  })

  test.describe('Workout Detail', () => {
    test('shows workout preview with exercises', async ({ authenticatedPage: page }) => {
      // Navigate to Monday's workout
      await page.goto('/workouts/monday')

      // Should show workout title
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible({ timeout: 10000 })

      // Should show exercise segments in timeline
      const timeline = page.locator('[class*="segment"], [class*="timeline"], section')
      await expect(timeline.first()).toBeVisible()
    })

    test('shows start workout button', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday')

      // Look for the main "Start" link that goes to the player
      const startButton = page.getByRole('link', { name: 'Start', exact: true })

      await expect(startButton).toBeVisible({ timeout: 10000 })
    })

    test('navigates to workout player', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday')

      // Click the main "Start" link
      const startButton = page.getByRole('link', { name: 'Start', exact: true })

      await startButton.click()

      // Should navigate to player page
      await expect(page).toHaveURL(/\/workouts\/monday\/play/)
    })
  })

  test.describe('Workout Player', () => {
    test('displays timer countdown', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      // Check for timer display (MM:SS format)
      const timerDisplay = page.locator('text=/\\d+:\\d{2}/')
      await expect(timerDisplay.first()).toBeVisible({ timeout: 10000 })
    })

    test('shows pause/resume controls', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      // Timer auto-starts, so pause button should be visible
      const pauseButton = page.getByRole('button', { name: /pause/i })
      await expect(pauseButton).toBeVisible({ timeout: 10000 })

      // Click pause
      await pauseButton.click()

      // Should now show resume button
      const resumeButton = page.getByRole('button', { name: /resume/i })
      await expect(resumeButton).toBeVisible()
    })

    test('shows restart button', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      const restartButton = page.getByRole('button', { name: /restart/i })
      await expect(restartButton).toBeVisible({ timeout: 10000 })
    })

    test('displays current exercise with details', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      // Should show current exercise name
      const exerciseHeading = page.locator('h1')
      await expect(exerciseHeading).toBeVisible({ timeout: 10000 })

      // Should show some exercise details
      const content = page.locator('section').first()
      await expect(content).toBeVisible()
    })

    test('shows overall progress bar', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      // Look for progress indicator
      const progressText = page.getByText(/progress|left/i)
      await expect(progressText.first()).toBeVisible({ timeout: 10000 })
    })

    test('shows timeline of exercises', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      // Look for timeline section
      const timelineLabel = page.getByText(/timeline/i)
      await expect(timelineLabel).toBeVisible({ timeout: 10000 })
    })

    test('can navigate back to workout detail', async ({ authenticatedPage: page }) => {
      await page.goto('/workouts/monday/play')

      // Click back button
      const backButton = page.getByRole('link', { name: /back/i })
      await expect(backButton).toBeVisible({ timeout: 10000 })

      await backButton.click()

      // Should be back on detail page
      await expect(page).toHaveURL('/workouts/monday')
    })
  })
})
