/**
 * E2E tests for recipe feature
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Recipe Feature', () => {
  test.describe('Recipe List Page', () => {
    test('shows recipes page with empty state for new user', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Should see the recipes page
      await expect(authenticatedPage).toHaveURL('/recipes');

      // Should see empty state or recipe list
      // Note: New users won't have recipes, so we check for Add Recipe button
      const addButton = authenticatedPage.getByRole('link', { name: /add recipe|new recipe/i });
      await expect(addButton).toBeVisible();
    });

    test('displays Add Recipe button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const addButton = authenticatedPage.getByRole('link', { name: /add recipe|new recipe/i });
      await expect(addButton).toBeVisible();
    });

    test('navigates to recipe creation form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const addButton = authenticatedPage.getByRole('link', { name: /add recipe|new recipe/i });
      await addButton.click();

      await expect(authenticatedPage).toHaveURL(/\/recipes\/new/);
    });
  });

  test.describe('Recipe Creation Form', () => {
    test('renders all form sections', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Check for form sections using headings
      await expect(authenticatedPage.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: /^Images/ })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: 'Time & Servings' })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: 'Nutrition (per serving)' })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: /^Ingredients/ })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: /^Steps/ })).toBeVisible();
    });

    test('shows required field indicators', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Title and description should have required indicators
      const titleSection = authenticatedPage.getByLabel(/title/i);
      await expect(titleSection).toBeVisible();

      // Create Recipe button should be visible
      await expect(
        authenticatedPage.getByRole('button', { name: /create recipe/i })
      ).toBeVisible();
    });

    test('validates required fields on submit', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Try to submit without filling required fields
      await authenticatedPage.getByRole('button', { name: /create recipe/i }).click();

      // Should show validation error
      await expect(
        authenticatedPage.getByText(/title is required|required/i)
      ).toBeVisible();
    });

    test('allows adding ingredients', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Find and click add ingredient button
      const addIngredientButton = authenticatedPage.getByText('+ Add ingredient');
      await expect(addIngredientButton.first()).toBeVisible();

      await addIngredientButton.first().click();

      // Should have more ingredient inputs now
      const ingredientInputs = authenticatedPage.getByPlaceholder('Ingredient name');
      await expect(ingredientInputs.first()).toBeVisible();
    });

    test('allows adding steps', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Find and click add step button
      const addStepButton = authenticatedPage.getByText('+ Add step');
      await expect(addStepButton).toBeVisible();

      await addStepButton.click();

      // Should have more step inputs now
      const stepTextareas = authenticatedPage.locator('textarea');
      await expect(stepTextareas.first()).toBeVisible();
    });

    test('cancel button navigates back', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');
      await authenticatedPage.goto('/recipes/new');

      const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i });
      await cancelButton.click();

      // Should navigate back (either to /recipes or previous page)
      await authenticatedPage.waitForLoadState('networkidle');
      // URL should not be /recipes/new anymore
      await expect(authenticatedPage).not.toHaveURL('/recipes/new');
    });
  });

  test.describe('Recipe Form Validation', () => {
    test('title field has required attribute', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Check that title input has required attribute
      const titleInput = authenticatedPage.getByLabel(/^title/i);
      await expect(titleInput).toHaveAttribute('required', '');
    });

    test('description field has required attribute', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Check that description input has required attribute
      const descriptionInput = authenticatedPage.getByLabel(/description/i);
      await expect(descriptionInput).toHaveAttribute('required', '');
    });

    test('shows error when no images uploaded', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Fill required text fields to bypass native validation
      await authenticatedPage.getByLabel(/^title/i).fill('Test Recipe');
      await authenticatedPage.getByLabel(/description/i).fill('Test description');

      // Submit without images - the form should pass native validation but show custom error
      await authenticatedPage.getByRole('button', { name: /create recipe/i }).click();

      // Should show image required error (custom validation since images don't have native required)
      await expect(authenticatedPage.getByText(/at least one image is required/i)).toBeVisible();
    });
  });

  test.describe('Bottom Navigation', () => {
    test('shows bottom nav on recipes list page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Should see both Home and Recipes tabs
      await expect(authenticatedPage.getByRole('link', { name: /home/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('link', { name: /recipes/i })).toBeVisible();
    });

    test('highlights Recipes tab when on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const recipesTab = authenticatedPage.getByRole('link', { name: /recipes/i });
      // Check for active styling (emerald color)
      await expect(recipesTab).toHaveClass(/emerald/);
    });

    test('does not show bottom nav on recipe detail pages', async ({ authenticatedPage }) => {
      // Navigate to a recipe detail page (it may 404, but nav should still be hidden)
      await authenticatedPage.goto('/recipes/some-recipe');

      // Bottom nav should not be visible
      const nav = authenticatedPage.locator('nav').filter({ hasText: /home.*recipes/i });
      await expect(nav).not.toBeVisible();
    });

    test('does not show bottom nav on recipe new page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes/new');

      // Bottom nav should not be visible on the create form
      const bottomNav = authenticatedPage.locator('nav.fixed.bottom-0');
      await expect(bottomNav).not.toBeVisible();
    });
  });
});
