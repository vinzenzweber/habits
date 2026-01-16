/**
 * E2E tests for bottom navigation
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Bottom Navigation', () => {
  test.describe('visibility', () => {
    test('shows on home page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Should see navigation with both tabs
      await expect(authenticatedPage.getByRole('link', { name: /home/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('link', { name: /recipes/i })).toBeVisible();
    });

    test('shows on recipes list page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      await expect(authenticatedPage.getByRole('link', { name: /home/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('link', { name: /recipes/i })).toBeVisible();
    });

    test('hidden on workout detail pages', async ({ authenticatedPage }) => {
      // Try to access a workout page
      await authenticatedPage.goto('/workouts/monday');

      // Navigation should be hidden
      // Use a more specific selector for the bottom nav
      const bottomNav = authenticatedPage.locator('nav.fixed.bottom-0');
      await expect(bottomNav).not.toBeVisible();
    });

    test('hidden on recipe detail pages', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/some-recipe');

      const bottomNav = authenticatedPage.locator('nav.fixed.bottom-0');
      await expect(bottomNav).not.toBeVisible();
    });

    test('hidden on recipe creation page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      const bottomNav = authenticatedPage.locator('nav.fixed.bottom-0');
      await expect(bottomNav).not.toBeVisible();
    });
  });

  test.describe('navigation behavior', () => {
    test('Home tab navigates to /', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      await authenticatedPage.getByRole('link', { name: /home/i }).click();

      await expect(authenticatedPage).toHaveURL('/');
    });

    test('Recipes tab navigates to /recipes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      await authenticatedPage.getByRole('link', { name: /recipes/i }).click();

      await expect(authenticatedPage).toHaveURL('/recipes');
    });
  });

  test.describe('active state styling', () => {
    test('Home tab is active on home page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      const homeTab = authenticatedPage.getByRole('link', { name: /home/i });
      const recipesTab = authenticatedPage.getByRole('link', { name: /recipes/i });

      // Home should have active color
      await expect(homeTab).toHaveClass(/text-emerald-400/);
      // Recipes should have inactive color
      await expect(recipesTab).toHaveClass(/text-slate-400/);
    });

    test('Recipes tab is active on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const homeTab = authenticatedPage.getByRole('link', { name: /home/i });
      const recipesTab = authenticatedPage.getByRole('link', { name: /recipes/i });

      // Home should have inactive color
      await expect(homeTab).toHaveClass(/text-slate-400/);
      // Recipes should have active color
      await expect(recipesTab).toHaveClass(/text-emerald-400/);
    });
  });

  test.describe('responsive behavior', () => {
    test('is fixed at bottom of viewport', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      const nav = authenticatedPage.locator('nav.fixed.bottom-0');
      await expect(nav).toBeVisible();

      // Verify it's positioned at bottom
      const navBox = await nav.boundingBox();
      const viewportSize = authenticatedPage.viewportSize();

      if (navBox && viewportSize) {
        // Nav bottom should be at or near viewport bottom
        expect(navBox.y + navBox.height).toBeCloseTo(viewportSize.height, -1);
      }
    });

    test('spans full width', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      const nav = authenticatedPage.locator('nav.fixed.bottom-0');
      await expect(nav).toBeVisible();

      const navBox = await nav.boundingBox();
      const viewportSize = authenticatedPage.viewportSize();

      if (navBox && viewportSize) {
        // Nav should span full width
        expect(navBox.width).toBeCloseTo(viewportSize.width, -1);
      }
    });
  });
});
