/**
 * Test fixtures for PDF recipe extraction tests
 *
 * PDF extraction uses a unified Vision API approach:
 * 1. Render each PDF page to a high-resolution PNG image using pdftoppm
 * 2. Send the image to GPT-4o Vision API for recipe extraction
 *
 * Test PDF: test-recipes-images.pdf (2 pages with recipe images)
 */

import fs from 'fs';
import path from 'path';

/**
 * Load the test PDF file as base64
 * This PDF contains image-based recipe content suitable for Vision API extraction
 */
export function getImagePdfBase64(): string {
  const pdfPath = path.join(__dirname, 'test-recipes-images.pdf');
  const buffer = fs.readFileSync(pdfPath);
  return buffer.toString('base64');
}

/**
 * Load the test PDF file as Buffer
 * This PDF contains image-based recipe content suitable for Vision API extraction
 */
export function getImagePdfBuffer(): Buffer {
  const pdfPath = path.join(__dirname, 'test-recipes-images.pdf');
  return fs.readFileSync(pdfPath);
}

/**
 * Check if the test PDF file exists
 */
export function imagePdfExists(): boolean {
  const pdfPath = path.join(__dirname, 'test-recipes-images.pdf');
  return fs.existsSync(pdfPath);
}

/**
 * Expected extraction results for Recipe 1 (Page 1)
 * "Exotischer Obstsalat mit Kokosquark"
 */
export const expectedRecipe1 = {
  title: 'Exotischer Obstsalat mit Kokosquark',
  servings: 2,
  prepTimeMinutes: 15,
  locale: 'de-DE',
  ingredientCount: 8, // Ananas, Apfel, Heidelbeeren, Magerquark, Kokosmilch, Kokosflocken, Süßstoff, Minzblätter
  stepCount: 3,
  nutrition: {
    calories: 335,
    protein: 23,
    fat: 13,
    carbohydrates: 30,
  },
  // Key ingredients to verify extraction (lowercase for matching)
  expectedIngredients: [
    'ananas',
    'apfel',
    'heidelbeeren',
    'magerquark',
    'kokosmilch',
    'kokosflocken',
  ],
} as const;

/**
 * Expected extraction results for Recipe 2 (Page 2)
 * "Pfirsich-Quark mit gerösteten Mandelstiften"
 */
export const expectedRecipe2 = {
  title: 'Pfirsich-Quark mit gerösteten Mandelstiften',
  servings: 2,
  prepTimeMinutes: 10,
  locale: 'de-DE',
  ingredientCount: 6, // Speisequark, Joghurt, Süßstoff, Vanille, Pfirsiche, Mandelstifte
  stepCount: 3,
  nutrition: {
    calories: 295,
    protein: 24,
    fat: 14,
    carbohydrates: 17,
  },
  // Key ingredients to verify extraction (lowercase for matching)
  expectedIngredients: ['speisequark', 'joghurt', 'pfirsich', 'mandel', 'vanille'],
} as const;

/**
 * Helper to check if a string contains a substring (case-insensitive)
 */
export function containsIgnoreCase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Helper to find an ingredient by name in ingredient groups
 */
export function findIngredient(
  ingredientGroups: Array<{ ingredients: Array<{ name: string }> }>,
  searchName: string
): { name: string } | undefined {
  for (const group of ingredientGroups) {
    const found = group.ingredients.find((i) => containsIgnoreCase(i.name, searchName));
    if (found) return found;
  }
  return undefined;
}

/**
 * Get all ingredient names as lowercase strings
 */
export function getAllIngredientNames(
  ingredientGroups: Array<{ ingredients: Array<{ name: string }> }>
): string[] {
  return ingredientGroups.flatMap((g) => g.ingredients.map((i) => i.name.toLowerCase()));
}

/**
 * Create mock OpenAI response for recipe 1
 */
export function createMockRecipe1Response() {
  return {
    title: 'Exotischer Obstsalat mit Kokosquark',
    description: 'Exotischer Obstsalat mit cremigem Kokosquark',
    servings: 2,
    prepTimeMinutes: 15,
    locale: 'de-DE',
    tags: ['dessert', 'vegetarisch', 'gesund'],
    nutrition: {
      calories: 335,
      protein: 23,
      fat: 13,
      carbohydrates: 30,
    },
    ingredientGroups: [
      {
        name: 'Obst',
        ingredients: [
          { name: 'Ananas', quantity: 0.5, unit: '' },
          { name: 'Apfel', quantity: 1, unit: '' },
          { name: 'Heidelbeeren', quantity: 1, unit: 'Handvoll' },
        ],
      },
      {
        name: 'Quark',
        ingredients: [
          { name: 'Magerquark', quantity: 300, unit: 'g' },
          { name: 'Kokosmilch', quantity: 80, unit: 'ml' },
          { name: 'Kokosflocken', quantity: 2, unit: 'EL' },
          { name: 'Süßstoff', quantity: 3, unit: 'Tropfen' },
          { name: 'Minzblätter', quantity: 6, unit: '' },
        ],
      },
    ],
    steps: [
      {
        number: 1,
        instruction: 'Ananas schälen und in Stücke schneiden, Apfel würfeln',
      },
      {
        number: 2,
        instruction:
          'Magerquark mit Kokosmilch, Kokosflocken und Süßstoff verrühren',
      },
      {
        number: 3,
        instruction: 'Obst anrichten, Quark darüber geben, mit Minze garnieren',
      },
    ],
  };
}

/**
 * Create mock OpenAI response for recipe 2
 */
export function createMockRecipe2Response() {
  return {
    title: 'Pfirsich-Quark mit gerösteten Mandelstiften',
    description: 'Cremiger Quark mit Pfirsichen und gerösteten Mandeln',
    servings: 2,
    prepTimeMinutes: 10,
    locale: 'de-DE',
    tags: ['dessert', 'vegetarisch', 'schnell'],
    nutrition: {
      calories: 295,
      protein: 24,
      fat: 14,
      carbohydrates: 17,
    },
    ingredientGroups: [
      {
        name: 'Zutaten',
        ingredients: [
          { name: 'Speisequark', quantity: 300, unit: 'g' },
          { name: 'Joghurt', quantity: 100, unit: 'g' },
          { name: 'Süßstoff', quantity: 4, unit: 'Tropfen' },
          { name: 'Vanille', quantity: 1, unit: 'Prise' },
          { name: 'Pfirsiche', quantity: 2, unit: '' },
          { name: 'Mandelstifte', quantity: 2, unit: 'EL' },
        ],
      },
    ],
    steps: [
      {
        number: 1,
        instruction: 'Speisequark mit Joghurt, Süßstoff und Vanille verrühren',
      },
      {
        number: 2,
        instruction: 'Pfirsiche waschen, halbieren und in Spalten schneiden',
      },
      {
        number: 3,
        instruction:
          'Mandelstifte in Pfanne rösten, Quark mit Pfirsichen und Mandeln anrichten',
      },
    ],
  };
}
