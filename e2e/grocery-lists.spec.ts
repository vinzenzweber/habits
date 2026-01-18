import { test, expect } from './fixtures/auth.fixture'

test.describe('Grocery Lists', () => {
  test.describe('List Page', () => {
    test('shows grocery lists page with create button', async ({ authenticatedPage: page }) => {
      await page.goto('/grocery-lists')

      // Check page title
      await expect(page.getByRole('heading', { name: /grocery lists/i })).toBeVisible()

      // Check for create button in header (the one next to the title)
      // Use first() since there may be multiple create buttons (header + empty state)
      await expect(page.getByRole('button', { name: /create/i }).first()).toBeVisible()
    })

    test('shows empty state when no lists exist', async ({ authenticatedPage: page }) => {
      await page.goto('/grocery-lists')

      // Should show empty state message
      await expect(page.getByText(/no grocery lists yet/i)).toBeVisible()
    })

    test('can create a new list', async ({ authenticatedPage: page }) => {
      await page.goto('/grocery-lists')

      // Click create button (use first() as there may be multiple create buttons)
      await page.getByRole('button', { name: /create/i }).first().click()

      // Fill in the name
      await page.getByLabel(/list name/i).fill('Weekly Groceries')

      // Submit
      await page.getByRole('button', { name: /create list/i }).click()

      // Should navigate to the new list detail page
      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Should show the list name
      await expect(page.getByRole('heading', { name: /weekly groceries/i })).toBeVisible()
    })

    test('shows list card after creating a list', async ({ authenticatedPage: page }) => {
      // First create a list
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Test Shopping List')
      await page.getByRole('button', { name: /create list/i }).click()

      // Wait for navigation to detail page
      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Go back to lists page
      await page.goto('/grocery-lists')

      // Should see the list card
      await expect(page.getByText('Test Shopping List')).toBeVisible()
    })
  })

  test.describe('List Detail', () => {
    test('shows empty state when list has no items', async ({ authenticatedPage: page }) => {
      // Create a list first
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Empty List Test')
      await page.getByRole('button', { name: /create list/i }).click()

      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Should show empty state
      await expect(page.getByText(/no items yet/i)).toBeVisible()
    })

    test('can add an item to the list', async ({ authenticatedPage: page }) => {
      // Create a list first
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Add Item Test')
      await page.getByRole('button', { name: /create list/i }).click()

      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Click add item button
      await page.getByRole('button', { name: /add item/i }).click()

      // Fill in item name
      await page.getByLabel(/item name/i).fill('Apples')

      // Add quantity
      await page.getByLabel(/quantity/i).fill('5')

      // Submit
      await page.getByRole('button', { name: /add item/i }).click()

      // Should see the item in the list
      await expect(page.getByText('Apples')).toBeVisible()
      await expect(page.getByText('(5)')).toBeVisible()
    })

    test('can check and uncheck items', async ({ authenticatedPage: page }) => {
      // Create a list with an item
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Check Test')
      await page.getByRole('button', { name: /create list/i }).click()

      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Add an item
      await page.getByRole('button', { name: /add item/i }).click()
      await page.getByLabel(/item name/i).fill('Milk')
      await page.getByRole('button', { name: /add item/i }).click()

      // Close the modal
      await page.getByRole('button', { name: /done/i }).click()

      // Wait for item to appear
      await expect(page.getByText('Milk')).toBeVisible()

      // Check the item (click the checkbox)
      await page.getByRole('button', { name: /check item/i }).click()

      // Progress should update
      await expect(page.getByText(/1\/1/)).toBeVisible()
    })

    test('can navigate to shopping mode', async ({ authenticatedPage: page }) => {
      // Create a list with items
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Shopping Mode Test')
      await page.getByRole('button', { name: /create list/i }).click()

      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Add an item
      await page.getByRole('button', { name: /add item/i }).click()
      await page.getByLabel(/item name/i).fill('Bread')
      await page.getByRole('button', { name: /add item/i }).click()
      await page.getByRole('button', { name: /done/i }).click()

      // Click shopping mode button
      await page.getByRole('link', { name: /shopping mode/i }).click()

      // Should be on shopping mode page
      await expect(page).toHaveURL(/\/grocery-lists\/\d+\/shop/)

      // Should see the list name
      await expect(page.getByText('Shopping Mode Test')).toBeVisible()

      // Should see the item
      await expect(page.getByText('Bread')).toBeVisible()
    })
  })

  test.describe('Shopping Mode', () => {
    test('can check items in shopping mode', async ({ authenticatedPage: page }) => {
      // Create a list with items
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Shopping Check Test')
      await page.getByRole('button', { name: /create list/i }).click()

      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Add items
      await page.getByRole('button', { name: /add item/i }).click()
      await page.getByLabel(/item name/i).fill('Eggs')
      await page.getByRole('button', { name: /add item/i }).click()
      await page.getByLabel(/item name/i).fill('Butter')
      await page.getByRole('button', { name: /add item/i }).click()
      await page.getByRole('button', { name: /done/i }).click()

      // Navigate to shopping mode
      await page.getByRole('link', { name: /shopping mode/i }).click()
      await expect(page).toHaveURL(/\/grocery-lists\/\d+\/shop/)

      // Progress should show 0/2
      await expect(page.getByText(/0\/2/)).toBeVisible()

      // Check first item (Eggs)
      await page.getByText('Eggs').click()

      // Progress should update to 1/2
      await expect(page.getByText(/1\/2/)).toBeVisible()
    })

    test('can exit shopping mode', async ({ authenticatedPage: page }) => {
      // Create a list
      await page.goto('/grocery-lists')
      await page.getByRole('button', { name: /create/i }).first().click()
      await page.getByLabel(/list name/i).fill('Exit Test')
      await page.getByRole('button', { name: /create list/i }).click()

      await expect(page).toHaveURL(/\/grocery-lists\/\d+/, { timeout: 5000 })

      // Navigate to shopping mode
      await page.getByRole('link', { name: /shopping mode/i }).click()
      await expect(page).toHaveURL(/\/grocery-lists\/\d+\/shop/)

      // Click exit button
      await page.getByRole('button', { name: /exit shopping mode/i }).click()

      // Should be back on detail page
      await expect(page).toHaveURL(/\/grocery-lists\/\d+$/)
    })
  })

  test.describe('Bottom Navigation', () => {
    test('shows groceries tab in bottom nav', async ({ authenticatedPage: page }) => {
      await page.goto('/')

      // Should see groceries tab
      await expect(page.getByRole('link', { name: /groceries/i })).toBeVisible()
    })

    test('can navigate to grocery lists from bottom nav', async ({ authenticatedPage: page }) => {
      await page.goto('/')

      // Click groceries tab
      await page.getByRole('link', { name: /groceries/i }).click()

      // Should be on grocery lists page
      await expect(page).toHaveURL('/grocery-lists')
    })
  })
})
