/**
 * E2E tests for recipe collections feature
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Recipe Collections', () => {
  test.describe('Collections Section on Recipes Page', () => {
    test('shows collections section on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Collections heading should be visible
      const collectionsHeading = authenticatedPage.getByRole('heading', { name: /collections/i });
      await expect(collectionsHeading).toBeVisible();
    });

    test('shows create collection button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // New Collection button should be visible
      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await expect(createButton).toBeVisible();
    });

    test('can open create collection modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Click new collection button
      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      // Modal should appear
      const modal = authenticatedPage.getByRole('heading', { name: /create collection/i });
      await expect(modal).toBeVisible();

      // Name input should be visible
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await expect(nameInput).toBeVisible();
    });

    test('can create a new collection', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Click new collection button
      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      // Fill in the name
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('My Test Collection');

      // Submit
      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Wait for modal to close and collection to appear
      await expect(authenticatedPage.getByText('My Test Collection')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Collection Detail Page', () => {
    test('can navigate to collection detail page', async ({ authenticatedPage }) => {
      // First create a collection
      await authenticatedPage.goto('/recipes');

      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Test Collection');

      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Wait for collection to appear
      await expect(authenticatedPage.getByText('Test Collection')).toBeVisible({ timeout: 5000 });

      // Click on the collection
      await authenticatedPage.getByText('Test Collection').click();

      // Should navigate to collection detail page
      await expect(authenticatedPage).toHaveURL(/\/recipes\/collections\/\d+/, { timeout: 5000 });

      // Collection name should be displayed
      await expect(authenticatedPage.getByRole('heading', { name: 'Test Collection' })).toBeVisible();
    });

    test('shows empty state when collection has no recipes', async ({ authenticatedPage }) => {
      // Create a collection
      await authenticatedPage.goto('/recipes');

      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Empty Collection');

      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Wait and click on collection
      await expect(authenticatedPage.getByText('Empty Collection')).toBeVisible({ timeout: 5000 });
      await authenticatedPage.getByText('Empty Collection').click();

      // Should show empty state
      await expect(authenticatedPage.getByText(/no recipes in this collection/i)).toBeVisible();
    });

    test('can open edit modal from collection detail page', async ({ authenticatedPage }) => {
      // Create a collection
      await authenticatedPage.goto('/recipes');

      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Edit Test');

      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });
      await submitButton.click();

      // Navigate to collection
      await expect(authenticatedPage.getByText('Edit Test')).toBeVisible({ timeout: 5000 });
      await authenticatedPage.getByText('Edit Test').click();

      // Click edit button
      await authenticatedPage.getByRole('button', { name: /edit/i }).click();

      // Edit modal should appear
      await expect(authenticatedPage.getByRole('heading', { name: /edit collection/i })).toBeVisible();
    });
  });

  test.describe('Collection Validation', () => {
    test('shows error for empty collection name', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Click new collection button
      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      // Try to submit with empty name
      const submitButton = authenticatedPage.getByRole('button', { name: /create collection/i });

      // Button should be disabled when name is empty
      await expect(submitButton).toBeDisabled();
    });

    test('shows character count for collection name', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Click new collection button
      const createButton = authenticatedPage.getByRole('button', { name: /new collection/i });
      await createButton.click();

      // Type in the name
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill('Short');

      // Character count should be visible
      await expect(authenticatedPage.getByText(/5\/100/)).toBeVisible();
    });
  });
});
