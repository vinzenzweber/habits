import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RecipeJson } from '../recipe-types'

// Mock the database module
vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}))

// Mock the recipes module
vi.mock('../recipes', () => ({
  getUniqueSlug: vi.fn(),
}))

// Import the mocked modules
import { query, transaction } from '../db'

// Import the module under test after mocks are set up
import {
  translateRecipeTool,
  SUPPORTED_TRANSLATION_LOCALES,
  type TranslationLocale,
} from '../recipe-tools'

const mockQuery = vi.mocked(query)
const mockTransaction = vi.mocked(transaction)

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

// Mock OpenAI client
const createMockOpenAI = (translatedRecipe: RecipeJson) => ({
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(translatedRecipe),
            },
          },
        ],
      }),
    },
  },
})

describe('recipe-translation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('SUPPORTED_TRANSLATION_LOCALES', () => {
    it('contains expected locales', () => {
      expect(SUPPORTED_TRANSLATION_LOCALES).toContain('de-DE')
      expect(SUPPORTED_TRANSLATION_LOCALES).toContain('en-US')
      expect(SUPPORTED_TRANSLATION_LOCALES).toContain('en-GB')
      expect(SUPPORTED_TRANSLATION_LOCALES).toContain('es-ES')
      expect(SUPPORTED_TRANSLATION_LOCALES).toContain('fr-FR')
      expect(SUPPORTED_TRANSLATION_LOCALES).toContain('it-IT')
    })

    it('has 6 supported locales', () => {
      expect(SUPPORTED_TRANSLATION_LOCALES.length).toBe(6)
    })
  })

  describe('translateRecipeTool', () => {
    it('translates recipe to target locale without saving', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })
      const translatedRecipe = createValidRecipeJson({
        slug: 'test-rezept',
        title: 'Test Rezept',
        description: 'Eine Testrezept Beschreibung',
        locale: 'de-DE',
        ingredientGroups: [
          {
            name: 'Hauptzutaten',
            ingredients: [
              { name: 'Eier', quantity: 3, unit: 'Stück' },
              { name: 'Käse', quantity: 50, unit: 'g' },
            ],
          },
        ],
        steps: [
          { number: 1, instruction: 'Die Eier verquirlen' },
          { number: 2, instruction: 'Käse hinzufügen und kochen' },
        ],
      })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const mockOpenAI = createMockOpenAI(translatedRecipe)

      const result = await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale,
        true,
        false
      )

      expect(result.success).toBe(true)
      expect(result.translatedRecipe.locale).toBe('de-DE')
      expect(result.translatedRecipe.title).toBe('Test Rezept')
      expect(result.savedAsNewVersion).toBe(false)
      expect(result.message).toContain('Use saveAsNew: true')
    })

    it('throws error when recipe not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      const mockOpenAI = createMockOpenAI(createValidRecipeJson())

      await expect(
        translateRecipeTool(
          mockOpenAI as never,
          '123',
          999,
          'de-DE' as TranslationLocale,
          true,
          false
        )
      ).rejects.toThrow('Recipe not found')
    })

    it('throws error for unsupported locale', async () => {
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

      const mockOpenAI = createMockOpenAI(createValidRecipeJson())

      await expect(
        translateRecipeTool(
          mockOpenAI as never,
          '123',
          1,
          'xx-XX' as TranslationLocale,
          true,
          false
        )
      ).rejects.toThrow('Unsupported locale')
    })

    it('throws error when source and target locale are the same', async () => {
      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'de-DE',
        tags: ['breakfast'],
        recipe_json: createValidRecipeJson({ locale: 'de-DE' }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const mockOpenAI = createMockOpenAI(createValidRecipeJson())

      await expect(
        translateRecipeTool(
          mockOpenAI as never,
          '123',
          1,
          'de-DE' as TranslationLocale,
          true,
          false
        )
      ).rejects.toThrow('already in')
    })

    it('saves translation as new version when saveAsNew is true', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })
      const translatedRecipe = createValidRecipeJson({
        slug: 'test-rezept',
        title: 'Test Rezept',
        description: 'Eine Testrezept Beschreibung',
        locale: 'de-DE',
      })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      // First query: get recipe
      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      // For updateRecipeTool which is called when saveAsNew is true
      mockTransaction.mockImplementationOnce(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [mockRow] }) // get current recipe
            .mockResolvedValueOnce({ rows: [] }) // deactivate current
            .mockResolvedValueOnce({
              rows: [{
                ...mockRow,
                id: 2,
                version: 2,
                title: 'Test Rezept',
                locale: 'de-DE',
                recipe_json: translatedRecipe,
              }]
            }), // insert new version
        }
        return callback(mockClient as never)
      })

      const mockOpenAI = createMockOpenAI(translatedRecipe)

      const result = await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale,
        true,
        true
      )

      expect(result.success).toBe(true)
      expect(result.savedAsNewVersion).toBe(true)
      expect(result.newVersion).toBe(2)
      expect(result.message).toContain('saved as version 2')
    })

    it('handles OpenAI response with markdown code blocks', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })
      const translatedRecipe = createValidRecipeJson({
        slug: 'test-rezept',
        title: 'Test Rezept',
        locale: 'de-DE',
      })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      // Mock OpenAI to return JSON wrapped in markdown code blocks
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: '```json\n' + JSON.stringify(translatedRecipe) + '\n```',
                  },
                },
              ],
            }),
          },
        },
      }

      const result = await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale,
        true,
        false
      )

      expect(result.success).toBe(true)
      expect(result.translatedRecipe.locale).toBe('de-DE')
    })

    it('throws error when OpenAI returns invalid JSON', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      // Mock OpenAI to return invalid response
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'This is not valid JSON at all',
                  },
                },
              ],
            }),
          },
        },
      }

      await expect(
        translateRecipeTool(
          mockOpenAI as never,
          '123',
          1,
          'de-DE' as TranslationLocale,
          true,
          false
        )
      ).rejects.toThrow()
    })

    it('throws error when OpenAI returns empty content', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      // Mock OpenAI to return null content
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: null,
                  },
                },
              ],
            }),
          },
        },
      }

      await expect(
        translateRecipeTool(
          mockOpenAI as never,
          '123',
          1,
          'de-DE' as TranslationLocale,
          true,
          false
        )
      ).rejects.toThrow('No translation response received')
    })

    it('calls OpenAI with correct model and low temperature', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })
      const translatedRecipe = createValidRecipeJson({ locale: 'de-DE' })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(translatedRecipe),
            },
          },
        ],
      })

      const mockOpenAI = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }

      await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale,
        true,
        false
      )

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.3,
        })
      )
    })

    it('includes measurement conversion instructions when systems differ', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })
      const translatedRecipe = createValidRecipeJson({ locale: 'de-DE' })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US', // Imperial
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(translatedRecipe),
            },
          },
        ],
      })

      const mockOpenAI = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }

      await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale, // Metric
        true, // adaptMeasurements = true
        false
      )

      // Check that the prompt includes measurement conversion instructions
      const callArgs = mockCreate.mock.calls[0][0]
      const promptContent = callArgs.messages[0].content
      expect(promptContent).toContain('Convert measurements')
    })

    it('skips measurement conversion when adaptMeasurements is false', async () => {
      const originalRecipe = createValidRecipeJson({ locale: 'en-US' })
      const translatedRecipe = createValidRecipeJson({ locale: 'de-DE' })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'test-recipe',
        version: 1,
        title: 'Test Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(translatedRecipe),
            },
          },
        ],
      })

      const mockOpenAI = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }

      await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale,
        false, // adaptMeasurements = false
        false
      )

      // Check that the prompt tells to keep measurements as-is
      const callArgs = mockCreate.mock.calls[0][0]
      const promptContent = callArgs.messages[0].content
      expect(promptContent).toContain('Keep all measurements exactly')
    })

    it('generates new slug from translated title', async () => {
      const originalRecipe = createValidRecipeJson({
        slug: 'original-recipe',
        title: 'Original Recipe',
        locale: 'en-US',
      })

      // Translated recipe returns same slug (simulating GPT not changing it)
      const translatedRecipe = createValidRecipeJson({
        slug: 'original-recipe', // Same slug - should be regenerated
        title: 'Rezept Original',
        locale: 'de-DE',
      })

      const mockRow = {
        id: 1,
        user_id: 123,
        slug: 'original-recipe',
        version: 1,
        title: 'Original Recipe',
        description: 'A test description',
        locale: 'en-US',
        tags: ['breakfast'],
        recipe_json: originalRecipe,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as never)

      const mockOpenAI = createMockOpenAI(translatedRecipe)

      const result = await translateRecipeTool(
        mockOpenAI as never,
        '123',
        1,
        'de-DE' as TranslationLocale,
        true,
        false
      )

      // The slug should be regenerated from the translated title
      expect(result.translatedRecipe.slug).toBe('rezept-original')
    })
  })
})
