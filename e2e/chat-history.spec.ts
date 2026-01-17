import { test, expect } from './fixtures/auth.fixture'

test.describe('Chat History', () => {
  test.describe('History Button', () => {
    test('shows history button in chat modal header', async ({ authenticatedPage: page }) => {
      // Open chat modal by clicking the chat button
      const chatButton = page.locator('[title="Personal Trainer"]').or(page.locator('button').filter({ hasText: '💬' }))
      await chatButton.click()

      // Wait for modal to open
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // History button should be visible
      await expect(page.getByRole('button', { name: /history/i })).toBeVisible()
    })

    test('opens history panel when history button is clicked', async ({ authenticatedPage: page }) => {
      // Open chat modal
      const chatButton = page.locator('[title="Personal Trainer"]').or(page.locator('button').filter({ hasText: '💬' }))
      await chatButton.click()
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // Click history button
      await page.getByRole('button', { name: /history/i }).click()

      // History panel should be visible
      await expect(page.getByText('Chat History')).toBeVisible()
    })
  })

  test.describe('Empty State', () => {
    test('shows empty state for new users with no chat history', async ({ authenticatedPage: page }) => {
      // Open chat modal
      const chatButton = page.locator('[title="Personal Trainer"]').or(page.locator('button').filter({ hasText: '💬' }))
      await chatButton.click()
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // Click history button
      await page.getByRole('button', { name: /history/i }).click()

      // Wait for history panel
      await expect(page.getByText('Chat History')).toBeVisible()

      // Should show empty state
      await expect(page.getByText('No conversations yet')).toBeVisible()
      await expect(page.getByText('Start chatting to see your history here.')).toBeVisible()
    })
  })

  test.describe('Close Functionality', () => {
    test('closes history panel when close button is clicked', async ({ authenticatedPage: page }) => {
      // Open chat modal
      const chatButton = page.locator('[title="Personal Trainer"]').or(page.locator('button').filter({ hasText: '💬' }))
      await chatButton.click()
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // Open history
      await page.getByRole('button', { name: /history/i }).click()
      await expect(page.getByText('Chat History')).toBeVisible()

      // Close history panel
      await page.getByLabel('Close history').click()

      // History panel should be hidden
      await expect(page.getByText('Chat History')).not.toBeVisible()

      // Chat modal should still be visible
      await expect(page.getByText('Personal Trainer')).toBeVisible()
    })
  })

  test.describe('Chat Session Creation and History', () => {
    test('creates a chat session when user sends a message', async ({ authenticatedPage: page }) => {
      // Open chat modal
      const chatButton = page.locator('[title="Personal Trainer"]').or(page.locator('button').filter({ hasText: '💬' }))
      await chatButton.click()
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // Send a message
      const textarea = page.locator('textarea[placeholder*="Type a message"]')
      await textarea.fill('Hello, I want to improve my workout routine.')
      await page.getByRole('button', { name: 'Send' }).click()

      // Wait for AI response (may take a while)
      await expect(page.locator('.bg-slate-800').first()).toBeVisible({ timeout: 30000 })

      // Close chat modal
      await page.getByLabel('Close').click()

      // Reopen chat modal
      await chatButton.click()
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // Open history
      await page.getByRole('button', { name: /history/i }).click()
      await expect(page.getByText('Chat History')).toBeVisible()

      // Should now show at least one session
      await expect(page.getByText('No conversations yet')).not.toBeVisible({ timeout: 5000 })

      // Should show the session with our message as preview (use .first() to avoid strict mode violation
      // since the message appears both in the history panel preview and potentially in the chat area)
      await expect(page.getByText(/Hello, I want to improve/i).first()).toBeVisible()
    })

    test('loads previous session when clicking on it in history', async ({ authenticatedPage: page }) => {
      // First, create a chat session with a unique message
      const testMessage = `Test message ${Date.now()}`

      // Open chat modal
      const chatButton = page.locator('[title="Personal Trainer"]').or(page.locator('button').filter({ hasText: '💬' }))
      await chatButton.click()
      await expect(page.getByText('Personal Trainer')).toBeVisible()

      // Send a message
      const textarea = page.locator('textarea[placeholder*="Type a message"]')
      await textarea.fill(testMessage)
      await page.getByRole('button', { name: 'Send' }).click()

      // Wait for AI response
      await expect(page.locator('.bg-slate-800').first()).toBeVisible({ timeout: 30000 })

      // Start a new chat
      await page.getByRole('button', { name: /new chat/i }).click()

      // The messages should be cleared
      await expect(page.getByText(testMessage)).not.toBeVisible()

      // Open history
      await page.getByRole('button', { name: /history/i }).click()
      await expect(page.getByText('Chat History')).toBeVisible()

      // Click on the previous session (first in the list as it's the most recent)
      const sessionButton = page.locator('button').filter({ hasText: testMessage.substring(0, 30) }).first()
      await sessionButton.click()

      // History panel should close
      await expect(page.getByText('Chat History')).not.toBeVisible()

      // The messages from the previous session should be loaded
      await expect(page.getByText(testMessage)).toBeVisible()
    })
  })
})
