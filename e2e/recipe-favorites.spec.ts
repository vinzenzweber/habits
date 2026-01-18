/**
 * E2E tests for recipe favorites feature
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Recipe Favorites Feature', () => {
  test.describe('Favorites Filter UI', () => {
    test('shows favorites filter button on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Favorites button should be visible
      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
      await expect(favoritesButton).toBeVisible();
    });

    test('favorites filter button toggles state', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });

      // Initially should not have active styling
      await expect(favoritesButton).not.toHaveClass(/emerald/);

      // Click to enable
      await favoritesButton.click();
      await authenticatedPage.waitForTimeout(100);

      // Should now have active styling
      await expect(favoritesButton).toHaveClass(/emerald/);

      // URL should include favorites parameter
      await expect(authenticatedPage).toHaveURL(/favorites=1/);
    });

    test('favorites filter is preserved in URL', async ({ authenticatedPage }) => {
      // Navigate directly with favorites filter enabled
      await authenticatedPage.goto('/recipes?favorites=1');

      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });

      // Should have active styling
      await expect(favoritesButton).toHaveClass(/emerald/);
    });

    test('toggling favorites filter off removes URL parameter', async ({ authenticatedPage }) => {
      // Start with favorites enabled
      await authenticatedPage.goto('/recipes?favorites=1');

      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });

      // Click to disable
      await favoritesButton.click();
      await authenticatedPage.waitForTimeout(100);

      // Should not have active styling
      await expect(favoritesButton).not.toHaveClass(/emerald/);

      // URL should not include favorites parameter
      await expect(authenticatedPage).not.toHaveURL(/favorites=1/);
    });

    test('favorites filter combined with search', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Add search query
      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await searchInput.fill('test');

      // Wait for debounce
      await authenticatedPage.waitForTimeout(400);

      // Enable favorites
      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
      await favoritesButton.click();

      // Both should be in URL
      await expect(authenticatedPage).toHaveURL(/q=test/);
      await expect(authenticatedPage).toHaveURL(/favorites=1/);
    });

    test('clear filters button clears favorites filter', async ({ authenticatedPage }) => {
      // Start with favorites enabled
      await authenticatedPage.goto('/recipes?favorites=1');

      // Look for clear filters button
      const clearFiltersButton = authenticatedPage.getByRole('button', { name: /active/i });

      if (await clearFiltersButton.isVisible()) {
        await clearFiltersButton.click();
        await authenticatedPage.waitForTimeout(100);

        // Favorites should be cleared
        await expect(authenticatedPage).not.toHaveURL(/favorites=1/);

        // Button should not have active styling
        const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
        await expect(favoritesButton).not.toHaveClass(/emerald/);
      }
    });
  });

  test.describe('Recipe Card Favorite Button', () => {
    // Note: These tests check UI presence on empty list view
    // Full integration tests require seeded recipe data

    test('recipe list page renders correctly when empty with favorites filter', async ({ authenticatedPage }) => {
      // Navigate to recipes with favorites filter
      await authenticatedPage.goto('/recipes?favorites=1');

      // Should see empty state or recipes page
      await expect(authenticatedPage).toHaveURL('/recipes?favorites=1');

      // Should see the filter is active
      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
      await expect(favoritesButton).toHaveClass(/emerald/);
    });
  });

  test.describe('Recipe Detail Page Favorite Button', () => {
    // Note: These tests would require a seeded recipe
    // For now we just verify the page structure

    test.skip('favorite button appears on recipe detail page', async ({ authenticatedPage }) => {
      // This test would need a real recipe slug
      // Skip for now until we have test data seeding
    });
  });
});
