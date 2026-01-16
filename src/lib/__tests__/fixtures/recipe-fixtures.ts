/**
 * Test fixtures for recipe-related tests
 * Provides mock factory functions for creating test data
 */

import type {
  Recipe,
  RecipeJson,
  RecipeSummary,
  RecipeImage,
  IngredientGroup,
  Ingredient,
  RecipeStep,
  NutritionInfo,
} from '../../recipe-types';

/**
 * Create a mock NutritionInfo object
 */
export function createMockNutrition(overrides?: Partial<NutritionInfo>): NutritionInfo {
  return {
    calories: 500,
    protein: 25,
    carbohydrates: 60,
    fat: 15,
    ...overrides,
  };
}

/**
 * Create a mock Ingredient object
 */
export function createMockIngredient(overrides?: Partial<Ingredient>): Ingredient {
  return {
    name: 'Test Ingredient',
    quantity: 100,
    unit: 'g',
    ...overrides,
  };
}

/**
 * Create a mock IngredientGroup object
 */
export function createMockIngredientGroup(overrides?: Partial<IngredientGroup>): IngredientGroup {
  return {
    name: 'Main Ingredients',
    ingredients: [
      createMockIngredient({ name: 'Flour', quantity: 200, unit: 'g' }),
      createMockIngredient({ name: 'Sugar', quantity: 100, unit: 'g' }),
    ],
    ...overrides,
  };
}

/**
 * Create a mock RecipeStep object
 */
export function createMockRecipeStep(overrides?: Partial<RecipeStep>): RecipeStep {
  return {
    number: 1,
    instruction: 'Mix all ingredients together',
    ...overrides,
  };
}

/**
 * Create a mock RecipeImage object
 */
export function createMockRecipeImage(overrides?: Partial<RecipeImage>): RecipeImage {
  return {
    url: '/api/recipes/images/user-1/test-image-123',
    caption: 'Test recipe image',
    isPrimary: false,
    ...overrides,
  };
}

/**
 * Create a mock RecipeJson object
 */
export function createMockRecipeJson(overrides?: Partial<RecipeJson>): RecipeJson {
  return {
    slug: 'test-recipe',
    title: 'Test Recipe',
    description: 'A delicious test recipe for unit testing',
    tags: ['healthy', 'quick'],
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    nutrition: createMockNutrition(),
    ingredientGroups: [createMockIngredientGroup()],
    steps: [
      createMockRecipeStep({ number: 1, instruction: 'Prepare ingredients' }),
      createMockRecipeStep({ number: 2, instruction: 'Mix everything together' }),
      createMockRecipeStep({ number: 3, instruction: 'Cook for 30 minutes' }),
    ],
    images: [
      createMockRecipeImage({ isPrimary: true }),
      createMockRecipeImage({ url: '/api/recipes/images/user-1/test-image-456' }),
    ],
    locale: 'en-US',
    sourceType: 'manual',
    ...overrides,
  };
}

/**
 * Create a mock Recipe object (full database entity)
 */
export function createMockRecipe(overrides?: Partial<Recipe>): Recipe {
  const recipeJson = overrides?.recipeJson ?? createMockRecipeJson();
  return {
    id: 1,
    userId: 1,
    slug: recipeJson.slug,
    version: 1,
    title: recipeJson.title,
    description: recipeJson.description,
    locale: recipeJson.locale,
    tags: recipeJson.tags,
    recipeJson,
    isActive: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock RecipeSummary object (for list views)
 */
export function createMockRecipeSummary(overrides?: Partial<RecipeSummary>): RecipeSummary {
  return {
    slug: 'test-recipe',
    title: 'Test Recipe',
    description: 'A delicious test recipe for unit testing',
    tags: ['healthy', 'quick'],
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    primaryImage: createMockRecipeImage({ isPrimary: true }),
    nutrition: createMockNutrition(),
    ...overrides,
  };
}

/**
 * Create a mock File object for testing image uploads
 */
export function createMockFile(
  name: string = 'test-image.jpg',
  type: string = 'image/jpeg',
  size: number = 1024
): File {
  // Create a buffer with the specified size
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);

  // Add JPEG magic bytes for valid image detection
  if (type === 'image/jpeg') {
    view[0] = 0xff;
    view[1] = 0xd8;
    view[2] = 0xff;
  } else if (type === 'image/png') {
    // PNG magic bytes
    view[0] = 0x89;
    view[1] = 0x50;
    view[2] = 0x4e;
    view[3] = 0x47;
    view[4] = 0x0d;
    view[5] = 0x0a;
    view[6] = 0x1a;
    view[7] = 0x0a;
  } else if (type === 'image/gif') {
    // GIF89a magic bytes
    view[0] = 0x47;
    view[1] = 0x49;
    view[2] = 0x46;
    view[3] = 0x38;
    view[4] = 0x39;
    view[5] = 0x61;
  } else if (type === 'image/webp') {
    // WebP magic bytes (RIFF....WEBP)
    view[0] = 0x52;
    view[1] = 0x49;
    view[2] = 0x46;
    view[3] = 0x46;
    // bytes 4-7 are file size, can be 0 for testing
    view[8] = 0x57;
    view[9] = 0x45;
    view[10] = 0x42;
    view[11] = 0x50;
  }

  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
}

/**
 * Create a mock Buffer with valid image magic bytes
 */
export function createMockImageBuffer(
  type: 'jpeg' | 'png' | 'gif' | 'webp' = 'jpeg',
  size: number = 1024
): Buffer {
  const buffer = Buffer.alloc(size);

  switch (type) {
    case 'jpeg':
      buffer[0] = 0xff;
      buffer[1] = 0xd8;
      buffer[2] = 0xff;
      break;
    case 'png':
      buffer[0] = 0x89;
      buffer[1] = 0x50;
      buffer[2] = 0x4e;
      buffer[3] = 0x47;
      buffer[4] = 0x0d;
      buffer[5] = 0x0a;
      buffer[6] = 0x1a;
      buffer[7] = 0x0a;
      break;
    case 'gif':
      buffer[0] = 0x47;
      buffer[1] = 0x49;
      buffer[2] = 0x46;
      buffer[3] = 0x38;
      buffer[4] = 0x39;
      buffer[5] = 0x61;
      break;
    case 'webp':
      buffer[0] = 0x52;
      buffer[1] = 0x49;
      buffer[2] = 0x46;
      buffer[3] = 0x46;
      buffer[8] = 0x57;
      buffer[9] = 0x45;
      buffer[10] = 0x42;
      buffer[11] = 0x50;
      break;
  }

  return buffer;
}

/**
 * Create a mock invalid buffer (not an image)
 */
export function createMockInvalidBuffer(size: number = 100): Buffer {
  const buffer = Buffer.alloc(size);
  // Fill with random-ish bytes that don't match any image magic bytes
  buffer[0] = 0x00;
  buffer[1] = 0x01;
  buffer[2] = 0x02;
  buffer[3] = 0x03;
  return buffer;
}
