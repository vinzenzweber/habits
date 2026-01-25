/**
 * E2E tests for recipe collections feature
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Recipe Collections', () => {
  test.describe('Collections Dropdown on Recipes Page', () => {
    test('shows collections dropdown on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Collections dropdown button should be visible
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await expect(collectionsDropdown).toBeVisible();
    });

    test('shows create collection option in dropdown', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open dropdown
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      // "Create new collection" option should be visible
      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await expect(createOption).toBeVisible();
    });

    test('can open create collection modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open dropdown
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      // Click create new collection
      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      // Modal should appear
      const modal = authenticatedPage.getByRole('heading', { name: /create collection/i });
      await expect(modal).toBeVisible();

      // Name input should be visible
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await expect(nameInput).toBeVisible();
    });

    test('can create a new collection', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open dropdown
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      // Click create new collection
      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      // Fill in the name
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('My Test Collection');

      // Submit
      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Wait for modal to close, then open dropdown again and check collection appears
      await authenticatedPage.waitForTimeout(1000);
      await collectionsDropdown.click();
      await expect(authenticatedPage.getByRole('menuitem', { name: /my test collection/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Collection Detail Page', () => {
    test('can navigate to collection detail page', async ({ authenticatedPage }) => {
      // First create a collection
      await authenticatedPage.goto('/recipes');

      // Open dropdown and create
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Test Collection');

      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Wait for modal to close, then open dropdown and click on collection
      await authenticatedPage.waitForTimeout(1000);
      await collectionsDropdown.click();

      const collectionItem = authenticatedPage.getByRole('menuitem', { name: /test collection/i });
      await expect(collectionItem).toBeVisible({ timeout: 5000 });
      await collectionItem.click();

      // Should navigate to collection detail page
      await expect(authenticatedPage).toHaveURL(/\/recipes\/collections\/\d+/, { timeout: 5000 });

      // Collection name should be displayed
      await expect(authenticatedPage.getByRole('heading', { name: 'Test Collection' })).toBeVisible();
    });

    test('shows empty state when collection has no recipes', async ({ authenticatedPage }) => {
      // Create a collection
      await authenticatedPage.goto('/recipes');

      // Open dropdown and create
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Empty Collection');

      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Wait and click on collection in dropdown
      await authenticatedPage.waitForTimeout(1000);
      await collectionsDropdown.click();

      const collectionItem = authenticatedPage.getByRole('menuitem', { name: /empty collection/i });
      await expect(collectionItem).toBeVisible({ timeout: 5000 });
      await collectionItem.click();

      // Should show empty state
      await expect(authenticatedPage.getByText(/no recipes in this collection/i)).toBeVisible();
    });

    test('can open edit modal from collection detail page', async ({ authenticatedPage }) => {
      // Create a collection
      await authenticatedPage.goto('/recipes');

      // Open dropdown and create
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Edit Test');

      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Navigate to collection
      await authenticatedPage.waitForTimeout(1000);
      await collectionsDropdown.click();

      const collectionItem = authenticatedPage.getByRole('menuitem', { name: /edit test/i });
      await expect(collectionItem).toBeVisible({ timeout: 5000 });
      await collectionItem.click();

      // Click edit button
      await authenticatedPage.getByRole('button', { name: /edit/i }).click();

      // Edit modal should appear
      await expect(authenticatedPage.getByRole('heading', { name: /edit collection/i })).toBeVisible();
    });
  });

  test.describe('Collection Validation', () => {
    test('shows error for empty collection name', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open dropdown and create
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      // Try to submit with empty name
      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });

      // Button should be disabled when name is empty
      await expect(submitButton).toBeDisabled();
    });

    test('shows character count for collection name', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open dropdown and create
      const collectionsDropdown = authenticatedPage.getByRole('button', { name: /collections/i });
      await collectionsDropdown.click();

      const createOption = authenticatedPage.getByRole('menuitem', { name: /create new collection/i });
      await createOption.click();

      // Type in the name
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Short');

      // Character count should be visible
      await expect(authenticatedPage.getByText(/5\/100/)).toBeVisible();
    });
  });
});
