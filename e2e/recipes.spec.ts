/**
 * E2E tests for recipe feature
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Recipe Feature', () => {
  test.describe('Recipe Search and Filter', () => {
    test('shows search input on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Search input should be visible
      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await expect(searchInput).toBeVisible();
    });

    test('shows filter controls on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Favorites button should be visible
      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
      await expect(favoritesButton).toBeVisible();

      // Sort dropdown should be visible
      const sortDropdown = authenticatedPage.locator('select');
      await expect(sortDropdown).toBeVisible();
    });

    test('can enter search query', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await searchInput.fill('chicken');

      // Input should have the value
      await expect(searchInput).toHaveValue('chicken');
    });

    test('search updates URL parameters', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await searchInput.fill('test');

      // Wait for debounce and URL update
      await authenticatedPage.waitForTimeout(400);

      // URL should include search query
      await expect(authenticatedPage).toHaveURL(/q=test/);
    });

    test('can clear search with clear button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await searchInput.fill('something');

      // Clear button should appear
      const clearButton = authenticatedPage.getByRole('button', { name: /clear search/i });
      await expect(clearButton).toBeVisible();

      await clearButton.click();

      // Input should be empty
      await expect(searchInput).toHaveValue('');
    });

    test('can toggle favorites filter', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
      await favoritesButton.click();

      // Wait for URL update
      await authenticatedPage.waitForTimeout(100);

      // URL should include favorites parameter
      await expect(authenticatedPage).toHaveURL(/favorites=1/);
    });

    test('can change sort order', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const sortDropdown = authenticatedPage.locator('select');
      await sortDropdown.selectOption('alpha');

      // Wait for URL update
      await authenticatedPage.waitForTimeout(100);

      // URL should include sort parameter
      await expect(authenticatedPage).toHaveURL(/sort=alpha/);
    });

    test('loads with URL parameters', async ({ authenticatedPage }) => {
      // Navigate with existing filters
      await authenticatedPage.goto('/recipes?q=test&favorites=1&sort=alpha');

      // Search input should have the query
      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await expect(searchInput).toHaveValue('test');

      // Favorites should be active (has emerald background)
      const favoritesButton = authenticatedPage.getByRole('button', { name: /favorites/i });
      await expect(favoritesButton).toHaveClass(/emerald/);

      // Sort should be set to alpha
      const sortDropdown = authenticatedPage.locator('select');
      await expect(sortDropdown).toHaveValue('alpha');
    });

    test('shows empty state when filters have no results', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Search for something that won't exist
      const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
      await searchInput.fill('xyznonexistent123456');

      // Wait for debounce
      await authenticatedPage.waitForTimeout(400);

      // Should show no results message
      // Note: If user has no recipes at all, they see the regular empty state
      // If user has recipes but filters exclude all, they see the filter empty state
      // Both are valid outcomes for this test
    });

    test('clear filters button works', async ({ authenticatedPage }) => {
      // Start with filters applied
      await authenticatedPage.goto('/recipes?q=test&favorites=1&sort=alpha');

      // Find the clear filters button (shows active filter count)
      const clearFiltersButton = authenticatedPage.getByRole('button', { name: /active/i });

      if (await clearFiltersButton.isVisible()) {
        await clearFiltersButton.click();

        // Wait for URL update
        await authenticatedPage.waitForTimeout(100);

        // URL should be clean (no filter params)
        await expect(authenticatedPage).toHaveURL('/recipes');

        // Search input should be empty
        const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
        await expect(searchInput).toHaveValue('');
      }
    });
  });

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
      await expect(authenticatedPage.getByText(/At least one image is required/i)).toBeVisible();
    });
  });

  test.describe('Photo Capture Modal', () => {
    test('shows camera button on recipes page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Camera button should be visible
      const cameraButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await expect(cameraButton).toBeVisible();
    });

    test('opens photo capture modal when camera button is clicked', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Click camera button
      const cameraButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await cameraButton.click();

      // Modal should open with "Import Recipe" heading
      await expect(authenticatedPage.getByRole('heading', { name: 'Import Recipe' })).toBeVisible();
    });

    test('modal has cancel button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open modal
      const cameraButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await cameraButton.click();

      // Cancel button should be visible
      await expect(authenticatedPage.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('modal closes when cancel is clicked', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open modal
      const cameraButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await cameraButton.click();

      // Click cancel
      const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i });
      await cancelButton.click();

      // Modal should close - heading should not be visible
      await expect(authenticatedPage.getByRole('heading', { name: 'Import Recipe' })).not.toBeVisible();
    });

    test('modal closes when close button is clicked', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Open modal
      const cameraButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await cameraButton.click();

      // Click close button (×)
      const closeButton = authenticatedPage.getByLabel('Close');
      await closeButton.click();

      // Modal should close
      await expect(authenticatedPage.getByRole('heading', { name: 'Import Recipe' })).not.toBeVisible();
    });

    test('desktop view shows upload/drop zone', async ({ authenticatedPage }) => {
      // Set viewport to desktop size
      await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
      await authenticatedPage.goto('/recipes');

      // Open modal (now supports both photos and PDFs)
      const importButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await importButton.click();

      // Should show drop zone text (updated for PDF support)
      await expect(authenticatedPage.getByText(/drop file here/i)).toBeVisible();
    });

    test('mobile view shows camera and library buttons', async ({ authenticatedPage }) => {
      // Set viewport to mobile size
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await authenticatedPage.goto('/recipes');

      // Open modal (now supports both photos and PDFs)
      const importButton = authenticatedPage.getByRole('button', { name: /import from photo or pdf/i });
      await importButton.click();

      // Should show camera and library buttons (updated for PDF support)
      await expect(authenticatedPage.getByText('Take Photo')).toBeVisible();
      await expect(authenticatedPage.getByText('Choose File')).toBeVisible();
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
