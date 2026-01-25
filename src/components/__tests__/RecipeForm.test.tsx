/**
 * Tests for RecipeForm component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeForm } from '../RecipeForm';
import { createMockRecipeJson } from '@/lib/__tests__/fixtures/recipe-fixtures';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}));

// Mock child components to isolate testing
vi.mock('../RecipeImageUpload', () => ({
  RecipeImageUpload: ({
    images,
    onChange,
  }: {
    images: { url: string }[];
    onChange: (images: { url: string }[]) => void;
  }) => (
    <div data-testid="mock-image-upload">
      <span>Images: {images.length}</span>
      <button
        type="button"
        onClick={() => onChange([...images, { url: '/test-image.jpg', isPrimary: true }])}
      >
        Add Mock Image
      </button>
    </div>
  ),
}));

vi.mock('../TagInput', () => ({
  TagInput: ({
    tags,
    onChange,
  }: {
    tags: string[];
    onChange: (tags: string[]) => void;
  }) => (
    <div data-testid="mock-tag-input">
      <span>Tags: {tags.join(', ')}</span>
      <button type="button" onClick={() => onChange([...tags, 'test-tag'])}>
        Add Mock Tag
      </button>
    </div>
  ),
}));

vi.mock('../IngredientGroupEditor', () => ({
  IngredientGroupEditor: ({
    groups,
    onChange,
  }: {
    groups: { name: string; ingredients: { name: string; quantity: number; unit: string }[] }[];
    onChange: (groups: typeof groups) => void;
  }) => (
    <div data-testid="mock-ingredient-editor">
      <span>Groups: {groups.length}</span>
      <button
        type="button"
        onClick={() =>
          onChange([
            { name: 'Test Group', ingredients: [{ name: 'Test Ingredient', quantity: 100, unit: 'g' }] },
          ])
        }
      >
        Add Mock Ingredient
      </button>
    </div>
  ),
}));

vi.mock('../StepsEditor', () => ({
  StepsEditor: ({
    steps,
    onChange,
  }: {
    steps: { number: number; instruction: string }[];
    onChange: (steps: typeof steps) => void;
  }) => (
    <div data-testid="mock-steps-editor">
      <span>Steps: {steps.length}</span>
      <button
        type="button"
        onClick={() =>
          onChange([{ number: 1, instruction: 'Test instruction' }])
        }
      >
        Add Mock Step
      </button>
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RecipeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ recipe: { slug: 'test-recipe' } }),
    });
  });

  describe('rendering', () => {
    it('renders all form sections', () => {
      render(<RecipeForm />);

      // Translation keys are returned by the mock useTranslations
      expect(screen.getByText('basicInfo')).toBeInTheDocument();
      expect(screen.getByText('images')).toBeInTheDocument();
      expect(screen.getByText('timeAndServings')).toBeInTheDocument();
      expect(screen.getByText('nutritionPerServing')).toBeInTheDocument();
      expect(screen.getByText('ingredients')).toBeInTheDocument();
      expect(screen.getByText('steps')).toBeInTheDocument();
    });

    it('renders title and description inputs', () => {
      render(<RecipeForm />);

      expect(screen.getByLabelText(/title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/)).toBeInTheDocument();
    });

    it('renders time and servings inputs', () => {
      render(<RecipeForm />);

      expect(screen.getByLabelText(/prepTimeMin/)).toBeInTheDocument();
      expect(screen.getByLabelText(/cookTimeMin/)).toBeInTheDocument();
      expect(screen.getByLabelText(/servings/i)).toBeInTheDocument();
    });

    it('renders nutrition inputs', () => {
      render(<RecipeForm />);

      expect(screen.getByLabelText(/calories/)).toBeInTheDocument();
      expect(screen.getByLabelText(/proteinG/)).toBeInTheDocument();
      expect(screen.getByLabelText(/carbsG/)).toBeInTheDocument();
      expect(screen.getByLabelText(/fatG/)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<RecipeForm />);

      expect(screen.getByRole('button', { name: /cancel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /createRecipe/ })).toBeInTheDocument();
    });

    it('renders mock child components', () => {
      render(<RecipeForm />);

      expect(screen.getByTestId('mock-image-upload')).toBeInTheDocument();
      expect(screen.getByTestId('mock-tag-input')).toBeInTheDocument();
      expect(screen.getByTestId('mock-ingredient-editor')).toBeInTheDocument();
      expect(screen.getByTestId('mock-steps-editor')).toBeInTheDocument();
    });
  });

  describe('pre-population for editing', () => {
    it('pre-populates form with initial recipe data', () => {
      const initialRecipe = createMockRecipeJson({
        title: 'Existing Recipe',
        description: 'Existing description',
        servings: 4,
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
      });

      render(<RecipeForm initialRecipe={initialRecipe} slug="existing-recipe" />);

      // Check title input value
      const titleInput = screen.getByLabelText(/title/) as HTMLInputElement;
      expect(titleInput.value).toBe('Existing Recipe');

      // Check description
      const descriptionInput = screen.getByLabelText(/description/) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('Existing description');

      // Check numeric fields
      const servingsInput = screen.getByLabelText(/servings/) as HTMLInputElement;
      expect(servingsInput.value).toBe('4');

      const prepTimeInput = screen.getByLabelText(/prepTimeMin/) as HTMLInputElement;
      expect(prepTimeInput.value).toBe('15');

      const cookTimeInput = screen.getByLabelText(/cookTimeMin/) as HTMLInputElement;
      expect(cookTimeInput.value).toBe('30');
    });

    it('shows Save Changes button when editing', () => {
      render(<RecipeForm initialRecipe={createMockRecipeJson()} slug="existing-recipe" />);
      expect(screen.getByRole('button', { name: /saveChanges/ })).toBeInTheDocument();
    });

    it('shows Create Recipe button when creating new', () => {
      render(<RecipeForm />);
      expect(screen.getByRole('button', { name: /createRecipe/ })).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows error when title is empty', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      // Add required fields except title
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      // Fill description using fireEvent.change for controlled input
      const descriptionInput = screen.getByLabelText(/description/);
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      // Fill title with whitespace only (passes browser required check but fails our trim validation)
      const titleInput = screen.getByLabelText(/title/);
      fireEvent.change(titleInput, { target: { value: '   ' } });

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(screen.getByText('titleRequired')).toBeInTheDocument();
      });
    });

    it('shows error when description is empty', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      // Fill title using fireEvent.change for controlled input
      const titleInput = screen.getByLabelText(/title/);
      fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });

      // Fill description with whitespace only (passes browser required check but fails our trim validation)
      const descriptionInput = screen.getByLabelText(/description/);
      fireEvent.change(descriptionInput, { target: { value: '   ' } });

      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(screen.getByText('descriptionRequired')).toBeInTheDocument();
      });
    });

    it('shows error when no images', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(screen.getByText('imageRequired')).toBeInTheDocument();
      });
    });

    it('prevents servings from being set to 0', () => {
      // This test verifies the component's defensive behavior that prevents
      // servings from being set to invalid values like 0. The onChange handler
      // does `parseInt(e.target.value) || 1`, which means 0 is falsy and becomes 1.
      render(<RecipeForm />);

      const servingsInput = screen.getByLabelText(/servings/) as HTMLInputElement;

      // Initial value should be 2 (default)
      expect(servingsInput.value).toBe('2');

      // Try to set servings to 0
      fireEvent.change(servingsInput, { target: { value: '0' } });

      // Component should default to 1 (falsy protection)
      expect(servingsInput.value).toBe('1');
    });

    it('shows error when no ingredients', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Step'));
      // Don't add ingredients

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(screen.getByText('ingredientRequired')).toBeInTheDocument();
      });
    });

    it('shows error when no steps', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      // Don't add steps

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(screen.getByText('stepRequired')).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls POST for new recipe', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/recipes',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('calls PATCH for editing recipe', async () => {
      const user = userEvent.setup();
      render(<RecipeForm initialRecipe={createMockRecipeJson()} slug="existing-recipe" />);

      await user.click(screen.getByRole('button', { name: /saveChanges/ }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/recipes/existing-recipe',
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    });

    it('navigates to recipe detail on success', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/recipes/test-recipe');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows error on submission failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables submit button while loading', async () => {
      // Make fetch take longer
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ recipe: { slug: 'test' } }),
                }),
              100
            )
          )
      );

      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      expect(screen.getByRole('button', { name: /saving/ })).toBeDisabled();
    });

    it('shows Saving... text while submitting', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ recipe: { slug: 'test' } }),
                }),
              100
            )
          )
      );

      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.type(screen.getByLabelText(/title/), 'Test Recipe');
      await user.type(screen.getByLabelText(/description/), 'Test description');
      await user.click(screen.getByText('Add Mock Image'));
      await user.click(screen.getByText('Add Mock Ingredient'));
      await user.click(screen.getByText('Add Mock Step'));

      await user.click(screen.getByRole('button', { name: /createRecipe/ }));

      expect(screen.getByText('saving')).toBeInTheDocument();
    });
  });

  describe('cancel button', () => {
    it('navigates back on cancel click', async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      await user.click(screen.getByRole('button', { name: /cancel/ }));

      expect(mockBack).toHaveBeenCalled();
    });
  });
});
