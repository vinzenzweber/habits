import { describe, it, expect } from 'vitest';

import {
  getRecipeDetailTranslations,
  type RecipeDetailTranslations,
} from '../recipe-detail';

// All required translation keys
const requiredKeys: (keyof RecipeDetailTranslations)[] = [
  'backToRecipes',
  'edit',
  'share',
  'prepTime',
  'cookTime',
  'servings',
  'nutrition',
  'perServing',
  'energy',
  'protein',
  'carbohydrates',
  'fat',
  'fiber',
  'ingredients',
  'instructions',
];

describe('getRecipeDetailTranslations', () => {
  describe('English (en-US)', () => {
    it('returns English translations for en-US locale', () => {
      const t = getRecipeDetailTranslations('en-US');

      expect(t.backToRecipes).toBe('← Back to recipes');
      expect(t.edit).toBe('Edit');
      expect(t.share).toBe('Share');
      expect(t.nutrition).toBe('Nutrition');
      expect(t.ingredients).toBe('Ingredients');
      expect(t.instructions).toBe('Instructions');
    });

    it('returns English translations for en-GB locale (variant)', () => {
      const t = getRecipeDetailTranslations('en-GB');

      // en-GB should map to en-US translations
      expect(t.backToRecipes).toBe('← Back to recipes');
      expect(t.edit).toBe('Edit');
      expect(t.nutrition).toBe('Nutrition');
    });
  });

  describe('German (de-DE)', () => {
    it('returns German translations for de-DE locale', () => {
      const t = getRecipeDetailTranslations('de-DE');

      expect(t.backToRecipes).toBe('← Zurück zu Rezepten');
      expect(t.edit).toBe('Bearbeiten');
      expect(t.share).toBe('Teilen');
      expect(t.nutrition).toBe('Nährwerte');
      expect(t.ingredients).toBe('Zutaten');
      expect(t.instructions).toBe('Zubereitung');
    });

    it('returns German translations for de-AT locale (variant)', () => {
      const t = getRecipeDetailTranslations('de-AT');

      // de-AT should map to de-DE translations
      expect(t.backToRecipes).toBe('← Zurück zu Rezepten');
      expect(t.nutrition).toBe('Nährwerte');
    });

    it('returns German translations for de-CH locale (variant)', () => {
      const t = getRecipeDetailTranslations('de-CH');

      // de-CH should map to de-DE translations
      expect(t.backToRecipes).toBe('← Zurück zu Rezepten');
      expect(t.nutrition).toBe('Nährwerte');
    });
  });

  describe('French (fr-FR)', () => {
    it('returns French translations for fr-FR locale', () => {
      const t = getRecipeDetailTranslations('fr-FR');

      expect(t.backToRecipes).toBe('← Retour aux recettes');
      expect(t.edit).toBe('Modifier');
      expect(t.nutrition).toBe('Nutrition');
      expect(t.ingredients).toBe('Ingrédients');
    });
  });

  describe('Spanish (es-ES)', () => {
    it('returns Spanish translations for es-ES locale', () => {
      const t = getRecipeDetailTranslations('es-ES');

      expect(t.backToRecipes).toBe('← Volver a recetas');
      expect(t.edit).toBe('Editar');
      expect(t.ingredients).toBe('Ingredientes');
    });
  });

  describe('Japanese (ja-JP)', () => {
    it('returns Japanese translations for ja-JP locale', () => {
      const t = getRecipeDetailTranslations('ja-JP');

      expect(t.backToRecipes).toBe('← レシピ一覧に戻る');
      expect(t.edit).toBe('編集');
      expect(t.ingredients).toBe('材料');
    });
  });

  describe('Chinese Simplified (zh-CN)', () => {
    it('returns Chinese translations for zh-CN locale', () => {
      const t = getRecipeDetailTranslations('zh-CN');

      expect(t.backToRecipes).toBe('← 返回食谱列表');
      expect(t.edit).toBe('编辑');
      expect(t.ingredients).toBe('食材');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to English for unsupported locale', () => {
      const t = getRecipeDetailTranslations('ko-KR');

      // Should return English translations
      expect(t.backToRecipes).toBe('← Back to recipes');
      expect(t.edit).toBe('Edit');
      expect(t.nutrition).toBe('Nutrition');
    });

    it('falls back to English for empty string', () => {
      const t = getRecipeDetailTranslations('');

      expect(t.backToRecipes).toBe('← Back to recipes');
    });

    it('falls back to English for invalid locale format', () => {
      const t = getRecipeDetailTranslations('invalid');

      expect(t.backToRecipes).toBe('← Back to recipes');
    });
  });

  describe('translation completeness', () => {
    const supportedLocales = [
      'en-US',
      'de-DE',
      'fr-FR',
      'es-ES',
      'it-IT',
      'nl-NL',
      'pt-BR',
      'ja-JP',
      'zh-CN',
    ];

    it.each(supportedLocales)(
      '%s has all required translation keys',
      (locale) => {
        const t = getRecipeDetailTranslations(locale);

        for (const key of requiredKeys) {
          expect(t[key]).toBeDefined();
          expect(typeof t[key]).toBe('string');
          expect(t[key].length).toBeGreaterThan(0);
        }
      }
    );

    it.each(supportedLocales)(
      '%s has unique translations (not copy of English, except en-US)',
      (locale) => {
        if (locale === 'en-US') {
          return; // Skip English check
        }

        const t = getRecipeDetailTranslations(locale);
        const en = getRecipeDetailTranslations('en-US');

        // At least some keys should differ from English
        const differentKeys = requiredKeys.filter((key) => t[key] !== en[key]);
        expect(differentKeys.length).toBeGreaterThan(0);
      }
    );
  });

  describe('locale variant mapping', () => {
    it('maps en-GB to en-US translations', () => {
      const enGB = getRecipeDetailTranslations('en-GB');
      const enUS = getRecipeDetailTranslations('en-US');

      for (const key of requiredKeys) {
        expect(enGB[key]).toBe(enUS[key]);
      }
    });

    it('maps de-AT to de-DE translations', () => {
      const deAT = getRecipeDetailTranslations('de-AT');
      const deDE = getRecipeDetailTranslations('de-DE');

      for (const key of requiredKeys) {
        expect(deAT[key]).toBe(deDE[key]);
      }
    });

    it('maps de-CH to de-DE translations', () => {
      const deCH = getRecipeDetailTranslations('de-CH');
      const deDE = getRecipeDetailTranslations('de-DE');

      for (const key of requiredKeys) {
        expect(deCH[key]).toBe(deDE[key]);
      }
    });
  });
});
