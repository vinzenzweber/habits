import { describe, it, expect } from 'vitest';
import {
  parseExtractionResponse,
  toRecipeJson,
  type ExtractedRecipeData,
} from '../recipe-extraction';

describe('parseExtractionResponse', () => {
  it('successfully parses a complete recipe response', () => {
    const rawResponse = {
      title: 'Chocolate Chip Cookies',
      description: 'Delicious homemade cookies with chocolate chips',
      servings: 24,
      prepTimeMinutes: 15,
      cookTimeMinutes: 12,
      locale: 'en-US',
      tags: ['dessert', 'baking', 'cookies'],
      nutrition: {
        calories: 150,
        protein: 2,
        carbohydrates: 20,
        fat: 7,
      },
      ingredientGroups: [
        {
          name: 'Main Ingredients',
          ingredients: [
            { name: 'flour', quantity: 2.5, unit: 'cups' },
            { name: 'sugar', quantity: 1, unit: 'cup' },
            { name: 'chocolate chips', quantity: 2, unit: 'cups' },
          ],
        },
      ],
      steps: [
        { number: 1, instruction: 'Preheat oven to 350°F' },
        { number: 2, instruction: 'Mix dry ingredients' },
        { number: 3, instruction: 'Add wet ingredients and combine' },
        { number: 4, instruction: 'Bake for 12 minutes' },
      ],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Chocolate Chip Cookies');
      expect(result.data.servings).toBe(24);
      expect(result.data.ingredientGroups).toHaveLength(1);
      expect(result.data.steps).toHaveLength(4);
      expect(result.data.nutrition.calories).toBe(150);
    }
  });

  it('handles partial extraction with missing optional fields', () => {
    const rawResponse = {
      title: 'Simple Recipe',
      description: 'A basic recipe',
      servings: 4,
      locale: 'en-US',
      tags: [],
      nutrition: {
        calories: 200,
        protein: 10,
        carbohydrates: 25,
        fat: 8,
      },
      ingredientGroups: [
        {
          name: 'Ingredients',
          ingredients: [{ name: 'ingredient 1', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Do the thing' }],
      // Missing prepTimeMinutes and cookTimeMinutes
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prepTimeMinutes).toBeUndefined();
      expect(result.data.cookTimeMinutes).toBeUndefined();
    }
  });

  it('returns error when model returns error response', () => {
    const rawResponse = {
      error: 'This image does not appear to contain a recipe',
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('This image does not appear to contain a recipe');
    }
  });

  it('returns error for non-object input', () => {
    const result = parseExtractionResponse('not an object');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid response format from vision model');
    }
  });

  it('returns error for null input', () => {
    const result = parseExtractionResponse(null);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid response format from vision model');
    }
  });

  it('returns error when title is missing', () => {
    const rawResponse = {
      description: 'A recipe without a title',
      servings: 4,
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Could not extract recipe title');
    }
  });

  it('returns error when title is empty', () => {
    const rawResponse = {
      title: '   ',
      description: 'A recipe with empty title',
      ingredientGroups: [],
      steps: [],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Could not extract recipe title');
    }
  });

  it('returns error when no ingredients or steps extracted', () => {
    const rawResponse = {
      title: 'Empty Recipe',
      description: 'No content',
      ingredientGroups: [],
      steps: [],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Could not extract ingredients or steps from image');
    }
  });

  it('uses default nutrition values when not provided', () => {
    const rawResponse = {
      title: 'Recipe Without Nutrition',
      description: 'Test recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should use default values
      expect(result.data.nutrition.calories).toBe(300);
      expect(result.data.nutrition.protein).toBe(15);
      expect(result.data.nutrition.carbohydrates).toBe(30);
      expect(result.data.nutrition.fat).toBe(10);
    }
  });

  it('uses default servings when not provided', () => {
    const rawResponse = {
      title: 'Recipe Without Servings',
      description: 'Test recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servings).toBe(4); // Default value
    }
  });

  it('uses default servings when invalid (negative)', () => {
    const rawResponse = {
      title: 'Recipe With Invalid Servings',
      description: 'Test recipe',
      servings: -1,
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servings).toBe(4); // Default value
    }
  });

  it('uses default servings when zero', () => {
    const rawResponse = {
      title: 'Recipe With Zero Servings',
      description: 'Test recipe',
      servings: 0,
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servings).toBe(4); // Default value
    }
  });

  it('filters out invalid ingredients', () => {
    const rawResponse = {
      title: 'Test Recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [
            { name: 'flour', quantity: 1, unit: 'cup' },
            'invalid ingredient', // Not an object
            { name: 'sugar', quantity: 0.5, unit: 'cup' },
            null, // Null value
          ],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ingredientGroups[0].ingredients).toHaveLength(2);
    }
  });

  it('filters out empty steps', () => {
    const rawResponse = {
      title: 'Test Recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [
        { number: 1, instruction: 'Mix ingredients' },
        { number: 2, instruction: '   ' }, // Empty after trim
        { number: 3, instruction: 'Bake' },
      ],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toHaveLength(2);
    }
  });

  it('filters out empty ingredient groups', () => {
    const rawResponse = {
      title: 'Test Recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
        {
          name: 'Empty Group',
          ingredients: [], // No ingredients
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ingredientGroups).toHaveLength(1);
      expect(result.data.ingredientGroups[0].name).toBe('Main');
    }
  });

  it('detects German locale', () => {
    const rawResponse = {
      title: 'Apfelkuchen',
      description: 'Ein leckerer deutscher Kuchen',
      locale: 'de-DE',
      ingredientGroups: [
        {
          name: 'Zutaten',
          ingredients: [{ name: 'Mehl', quantity: 250, unit: 'g' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Alle Zutaten mischen' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe('de-DE');
    }
  });

  it('uses default locale when not provided', () => {
    const rawResponse = {
      title: 'Test Recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe('en-US');
    }
  });

  it('filters out non-string tags', () => {
    const rawResponse = {
      title: 'Test Recipe',
      tags: ['dinner', 123, 'quick', null, 'vegetarian'],
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(['dinner', 'quick', 'vegetarian']);
    }
  });

  it('uses empty array when tags is not an array', () => {
    const rawResponse = {
      title: 'Test Recipe',
      tags: 'not an array',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Mix' }],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('assigns step numbers based on index when not provided', () => {
    const rawResponse = {
      title: 'Test Recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [
        { instruction: 'First step' },
        { instruction: 'Second step' },
        { instruction: 'Third step' },
      ],
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[0].number).toBe(1);
      expect(result.data.steps[1].number).toBe(2);
      expect(result.data.steps[2].number).toBe(3);
    }
  });

  it('handles fiber in nutrition when provided', () => {
    const rawResponse = {
      title: 'Fiber-Rich Recipe',
      ingredientGroups: [
        {
          name: 'Main',
          ingredients: [{ name: 'lentils', quantity: 1, unit: 'cup' }],
        },
      ],
      steps: [{ number: 1, instruction: 'Cook' }],
      nutrition: {
        calories: 230,
        protein: 18,
        carbohydrates: 40,
        fat: 1,
        fiber: 15,
      },
    };

    const result = parseExtractionResponse(rawResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nutrition.fiber).toBe(15);
    }
  });
});

describe('toRecipeJson', () => {
  const sampleExtractedData: ExtractedRecipeData = {
    title: 'Test Recipe',
    description: 'A test recipe',
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    locale: 'en-US',
    tags: ['dinner', 'quick'],
    nutrition: {
      calories: 400,
      protein: 25,
      carbohydrates: 35,
      fat: 15,
    },
    ingredientGroups: [
      {
        name: 'Main',
        ingredients: [{ name: 'chicken', quantity: 500, unit: 'g' }],
      },
    ],
    steps: [
      { number: 1, instruction: 'Prepare chicken' },
      { number: 2, instruction: 'Cook' },
    ],
  };

  it('converts extracted data to RecipeJson with image', () => {
    const recipeJson = toRecipeJson(sampleExtractedData, 'test-recipe', '/api/recipes/images/1/abc123');

    expect(recipeJson.slug).toBe('test-recipe');
    expect(recipeJson.title).toBe('Test Recipe');
    expect(recipeJson.sourceType).toBe('ai_generated');
    expect(recipeJson.images).toHaveLength(1);
    expect(recipeJson.images[0].url).toBe('/api/recipes/images/1/abc123');
    expect(recipeJson.images[0].isPrimary).toBe(true);
  });

  it('converts extracted data to RecipeJson without image', () => {
    const recipeJson = toRecipeJson(sampleExtractedData, 'test-recipe');

    expect(recipeJson.slug).toBe('test-recipe');
    expect(recipeJson.images).toHaveLength(0);
    expect(recipeJson.sourceType).toBe('ai_generated');
  });

  it('preserves all extracted data in RecipeJson', () => {
    const recipeJson = toRecipeJson(sampleExtractedData, 'test-recipe');

    expect(recipeJson.title).toBe(sampleExtractedData.title);
    expect(recipeJson.description).toBe(sampleExtractedData.description);
    expect(recipeJson.servings).toBe(sampleExtractedData.servings);
    expect(recipeJson.prepTimeMinutes).toBe(sampleExtractedData.prepTimeMinutes);
    expect(recipeJson.cookTimeMinutes).toBe(sampleExtractedData.cookTimeMinutes);
    expect(recipeJson.locale).toBe(sampleExtractedData.locale);
    expect(recipeJson.tags).toEqual(sampleExtractedData.tags);
    expect(recipeJson.nutrition).toEqual(sampleExtractedData.nutrition);
    expect(recipeJson.ingredientGroups).toEqual(sampleExtractedData.ingredientGroups);
    expect(recipeJson.steps).toEqual(sampleExtractedData.steps);
  });
});
