import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RecipeJson, CreateRecipeInput } from '../recipe-types'

// Mock the database module
vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}))

// Mock the recipes module to avoid auth import
vi.mock('../recipes', () => ({
  getUniqueSlug: vi.fn(),
}))

// Import the mocked modules
import { query, transaction } from '../db'
import { getUniqueSlug } from '../recipes'

// Import the module under test after mocks are set up
import {
  searchRecipesTool,
  getRecipeTool,
  createRecipeTool,
  updateRecipeTool,
} from '../recipe-tools'

const mockQuery = vi.mocked(query)
const mockTransaction = vi.mocked(transaction)
const mockGetUniqueSlug = vi.mocked(getUniqueSlug)

// Sample valid RecipeJson for testing
const createValidRecipeJson = (overrides: Partial<RecipeJson> = {}): RecipeJson => ({
  slug: 'test-recipe',
  title: 'Test Recipe',
  description: 'A test recipe description',
  tags: ['breakfast', 'high-protein'],
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  nutrition: {
    calories: 300,
    protein: 25,
    carbohydrates: 30,
    fat: 10,
  },
  ingredientGroups: [
    {
      name: 'Main Ingredients',
      ingredients: [
        { name: 'Eggs', quantity: 3, unit: 'pieces' },
        { name: 'Cheese', quantity: 50, unit: 'g' },
      ],
    },
  ],
  steps: [
    { number: 1, instruction: 'Beat the eggs' },
    { number: 2, instruction: 'Add cheese and cook' },
  ],
  images: [
    { url: 'https://example.com/image.jpg', isPrimary: true },
  ],
  locale: 'en-US',
  ...overrides,
})

describe('recipe-tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('searchRecipesTool', () => {
    it('returns recipes matching a text query', async () => {
      const mockRows = [
        {
          slug: 'omelette',
          title: 'Cheese Omelette',
          description: 'A fluffy omelette',
          tags: ['breakfast'],
          servings: 2,
          prep_time_minutes: 5,
          cook_time_minutes: 10,
          nutrition: { calories: 300, protein: 20, carbohydrates: 2, fat: 24 },
          recipe_description: 'A fluffy omelette',
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never)

      const results = await searchRecipesTool('123', 'omelette')

      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe('omelette')
      expect(results[0].title).toBe('Cheese Omelette')
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    it('returns recipes matching tags', async () => {
      const mockRows = [
        {
          slug: 'protein-shake',
          title: 'Protein Shake',
          description: 'High protein shake',
          tags: ['high-protein', 'snack'],
          servings: 1,
          prep_time_minutes: 5,
          cook_time_minutes: null,
          nutrition: { calories: 200, protein: 30, carbohydrates: 10, fat: 5 },
          recipe_description: 'High protein shake',
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never)

      const results = await searchRecipesTool('123', undefined, ['high-protein'])

      expect(results).toHaveLength(1)
      expect(results[0].tags).toContain('high-protein')
    })

    it('returns recipes matching both query and tags', async () => {
      const mockRows = [
        {
          slug: 'breakfast-burrito',
          title: 'Breakfast Burrito',
          description: 'High protein breakfast',
          tags: ['breakfast', 'high-protein'],
          servings: 2,
          prep_time_minutes: 10,
          cook_time_minutes: 15,
          nutrition: { calories: 400, protein: 25, carbohydrates: 35, fat: 18 },
          recipe_description: 'High protein breakfast',
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never)

      const results = await searchRecipesTool('123', 'breakfast', ['high-protein'])

      expect(results).toHaveLength(1)
    })

    it('returns all recipes when no filters provided', async () => {
      const mockRows = [
        {
          slug: 'recipe-1',
          title: 'Recipe 1',
          description: 'Description 1',
          tags: ['tag1'],
          servings: 2,
          prep_time_minutes: 10,
          cook_time_minutes: 20,
          nutrition: { calories: 300, protein: 20, carbohydrates: 30, fat: 10 },
          recipe_description: 'Description 1',
        },
        {
          slug: 'recipe-2',
          title: 'Recipe 2',
          description: 'Description 2',
          tags: ['tag2'],
          servings: 4,
          prep_time_minutes: 15,
          cook_time_minutes: 30,
          nutrition: { calories: 400, protein: 25, carbohydrates: 40, fat: 15 },
          recipe_description: 'Description 2',
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 2 } as never)

      const results = await searchRecipesTool('123')

      expect(results).toHaveLength(2)
    })

    it('returns empty array when no recipes found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      const results = await searchRecipesTool('123', 'nonexistent')

      expect(results).toHaveLength(0)
    })

    it('respects the limit parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      await searchRecipesTool('123', 'test', undefined, 5)

      // Check that the query was called with the limit
      const queryCall = mockQuery.mock.calls[0]
      expect(queryCall[1]).toContain(5)
    })

    it('handles null prep/cook times correctly', async () => {
      const mockRows = [
        {
          slug: 'no-cook-recipe',
          title: 'No Cook Recipe',
          description: 'A recipe with no cooking',
          tags: ['snack'],
          servings: 1,
          prep_time_minutes: null,
          cook_time_minutes: null,
          nutrition: { calories: 150, protein: 5, carbohydrates: 20, fat: 7 },
          recipe_description: 'A recipe with no cooking',
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never)

      const results = await searchRecipesTool('123')

      expect(results[0].prepTimeMinutes).toBeUndefined()
      expect(results[0].cookTimeMinutes).toBeUndefined()
    })
  })

  describe('getRecipeTool', () => {
    it('returns a recipe when found', async () => {
      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: createValidRecipeJson(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const result = await getRecipeTool('123', 'test-recipe')

      expect(result).not.toBeNull()
      expect(result?.slug).toBe('test-recipe')
      expect(result?.title).toBe('Test Recipe')
    })

    it('returns null when recipe not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      const result = await getRecipeTool('123', 'nonexistent')

      expect(result).toBeNull()
    })

    it('queries with correct user ID and slug', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      await getRecipeTool('456', 'my-recipe')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        [456, 'my-recipe']
      )
    })
  })

  describe('createRecipeTool', () => {
    it('creates a recipe with valid input', async () => {
      const recipeJson = createValidRecipeJson()
      const input: CreateRecipeInput = {
        title: 'New Recipe',
        description: 'A new recipe',
        tags: ['dinner'],
        locale: 'en-US',
        recipeJson,
      }

      const mockCreatedRow = {
        id: 1,
        user_id: 123,
        slug: 'new-recipe',
        version: 1,
        title: 'New Recipe',
        description: 'A new recipe',
        locale: 'en-US',
        tags: ['dinner'],
        recipe_json: recipeJson,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      // Mock getUniqueSlug to return the expected slug
      mockGetUniqueSlug.mockResolvedValueOnce('new-recipe')

      // Mock transaction to properly execute the callback and return the recipe
      mockTransaction.mockImplementationOnce(async (callback) => {
        const mockClient = {
          query: vi.fn()
            // First query: get max version
            .mockResolvedValueOnce({ rows: [{ version: null }] })
            // Second query: deactivate old (no-op for new)
            .mockResolvedValueOnce({ rows: [] })
            // Third query: insert new recipe
            .mockResolvedValueOnce({ rows: [mockCreatedRow] }),
        }
        return callback(mockClient as never)
      })

      const result = await createRecipeTool('123', input)

      expect(result.success).toBe(true)
      expect(result.recipe).toBeDefined()
      expect(result.message).toContain('created successfully')
    })

    it('throws error for invalid recipe structure', async () => {
      const invalidRecipeJson = {
        // Missing required fields
        title: 'Invalid Recipe',
      }

      const input = {
        title: 'Invalid Recipe',
        recipeJson: invalidRecipeJson as RecipeJson,
      }

      await expect(createRecipeTool('123', input)).rejects.toThrow('Invalid recipe structure')
    })
  })

  describe('updateRecipeTool', () => {
    it('updates a recipe and increments version', async () => {
      const recipeJson = createValidRecipeJson({ title: 'Updated Recipe' })

      const mockCurrentRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Original Recipe',
        description: 'Original description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: createValidRecipeJson(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const mockUpdatedRow = {
        ...mockCurrentRow,
        id: 2,
        version: 2,
        title: 'Updated Recipe',
        recipe_json: recipeJson,
      }

      mockTransaction.mockImplementationOnce(async (callback) => {
        const mockClient = {
          query: vi.fn()
            // First query: get current recipe
            .mockResolvedValueOnce({ rows: [mockCurrentRow] })
            // Second query: deactivate current
            .mockResolvedValueOnce({ rows: [] })
            // Third query: insert new version
            .mockResolvedValueOnce({ rows: [mockUpdatedRow] }),
        }
        return callback(mockClient as never)
      })

      const result = await updateRecipeTool('123', 'test-recipe', {
        title: 'Updated Recipe',
        recipeJson,
      })

      expect(result.success).toBe(true)
      expect(result.version).toBe(2)
      expect(result.message).toContain('version 2')
    })

    it('throws error when recipe not found', async () => {
      mockTransaction.mockImplementationOnce(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValueOnce({ rows: [] }),
        }
        return callback(mockClient as never)
      })

      await expect(
        updateRecipeTool('123', 'nonexistent', { title: 'New Title' })
      ).rejects.toThrow('Recipe not found')
    })

    it('throws error for invalid recipeJson update', async () => {
      const invalidRecipeJson = {
        title: 'Invalid',
        // Missing required fields
      }

      await expect(
        updateRecipeTool('123', 'test-recipe', {
          recipeJson: invalidRecipeJson as RecipeJson,
        })
      ).rejects.toThrow('Invalid recipe structure')
    })

    it('preserves existing values when not provided in update', async () => {
      const originalRecipeJson = createValidRecipeJson()

      const mockCurrentRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Original Title',
        description: 'Original description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipeJson,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const mockUpdatedRow = {
        ...mockCurrentRow,
        id: 2,
        version: 2,
        title: 'New Title',
        // description, locale, tags preserved
      }

      let capturedInsertValues: unknown[] = []

      mockTransaction.mockImplementationOnce(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [mockCurrentRow] })
            .mockResolvedValueOnce({ rows: [] })
            .mockImplementationOnce((sql: string, values: unknown[]) => {
              capturedInsertValues = values
              return Promise.resolve({ rows: [mockUpdatedRow] })
            }),
        }
        return callback(mockClient as never)
      })

      await updateRecipeTool('123', 'test-recipe', {
        title: 'New Title',
        // Not providing description, locale, tags - should preserve originals
      })

      // Check that original values were preserved in the insert
      expect(capturedInsertValues[4]).toBe('Original description') // description
      expect(capturedInsertValues[5]).toBe('en-US') // locale
    })
  })
})
