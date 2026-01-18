import { describe, it, expect } from 'vitest';
import {
  PREDEFINED_TAGS,
  TAG_CATEGORIES,
  TAG_CATEGORY_ORDER,
  CATEGORY_COLORS,
  getPredefinedTagIds,
  getTagById,
  getTagsByCategory,
  isPredefinedTag,
  getTagCategory,
  getTagColorClass,
  getGroupedPredefinedTags,
  type TagCategory,
} from '../predefined-tags';

describe('predefined-tags', () => {
  describe('PREDEFINED_TAGS', () => {
    it('has all expected categories represented', () => {
      const categories = new Set(PREDEFINED_TAGS.map(t => t.category));
      expect(categories).toContain('meal');
      expect(categories).toContain('diet');
      expect(categories).toContain('cuisine');
      expect(categories).toContain('category');
      expect(categories).toContain('effort');
    });

    it('has unique tag IDs', () => {
      const ids = PREDEFINED_TAGS.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all tags have required properties', () => {
      for (const tag of PREDEFINED_TAGS) {
        expect(tag.id).toBeDefined();
        expect(tag.id.length).toBeGreaterThan(0);
        expect(tag.label).toBeDefined();
        expect(tag.label.length).toBeGreaterThan(0);
        expect(tag.labelEn).toBeDefined();
        expect(tag.labelEn.length).toBeGreaterThan(0);
        expect(tag.category).toBeDefined();
      }
    });

    it('tag IDs are lowercase and hyphenated', () => {
      for (const tag of PREDEFINED_TAGS) {
        expect(tag.id).toBe(tag.id.toLowerCase());
        expect(tag.id).not.toContain(' ');
        // Allow alphanumeric and hyphens only
        expect(tag.id).toMatch(/^[a-z0-9-]+$/);
      }
    });
  });

  describe('TAG_CATEGORIES', () => {
    it('has all expected categories', () => {
      expect(TAG_CATEGORIES).toHaveProperty('meal');
      expect(TAG_CATEGORIES).toHaveProperty('diet');
      expect(TAG_CATEGORIES).toHaveProperty('cuisine');
      expect(TAG_CATEGORIES).toHaveProperty('category');
      expect(TAG_CATEGORIES).toHaveProperty('effort');
    });

    it('each category has label and labelEn', () => {
      for (const category of Object.values(TAG_CATEGORIES)) {
        expect(category.label).toBeDefined();
        expect(category.labelEn).toBeDefined();
      }
    });
  });

  describe('TAG_CATEGORY_ORDER', () => {
    it('contains all categories', () => {
      const categoryKeys = Object.keys(TAG_CATEGORIES) as TagCategory[];
      expect(TAG_CATEGORY_ORDER).toHaveLength(categoryKeys.length);
      for (const category of categoryKeys) {
        expect(TAG_CATEGORY_ORDER).toContain(category);
      }
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('has colors for all categories', () => {
      for (const category of TAG_CATEGORY_ORDER) {
        expect(CATEGORY_COLORS[category]).toBeDefined();
        expect(CATEGORY_COLORS[category]).toMatch(/^bg-.*text-.*/);
      }
    });
  });

  describe('getPredefinedTagIds', () => {
    it('returns all tag IDs', () => {
      const ids = getPredefinedTagIds();
      expect(ids).toHaveLength(PREDEFINED_TAGS.length);
      for (const tag of PREDEFINED_TAGS) {
        expect(ids).toContain(tag.id);
      }
    });
  });

  describe('getTagById', () => {
    it('returns tag for valid predefined ID', () => {
      const tag = getTagById('breakfast');
      expect(tag).toBeDefined();
      expect(tag?.id).toBe('breakfast');
      expect(tag?.category).toBe('meal');
    });

    it('returns undefined for non-existent ID', () => {
      const tag = getTagById('non-existent-tag');
      expect(tag).toBeUndefined();
    });

    it('returns undefined for custom tag ID', () => {
      const tag = getTagById('my-custom-tag');
      expect(tag).toBeUndefined();
    });
  });

  describe('getTagsByCategory', () => {
    it('returns only tags of specified category', () => {
      const mealTags = getTagsByCategory('meal');
      expect(mealTags.length).toBeGreaterThan(0);
      for (const tag of mealTags) {
        expect(tag.category).toBe('meal');
      }
    });

    it('returns all expected meal tags', () => {
      const mealTags = getTagsByCategory('meal');
      const mealIds = mealTags.map(t => t.id);
      expect(mealIds).toContain('breakfast');
      expect(mealIds).toContain('lunch');
      expect(mealIds).toContain('dinner');
    });

    it('returns all expected diet tags', () => {
      const dietTags = getTagsByCategory('diet');
      const dietIds = dietTags.map(t => t.id);
      expect(dietIds).toContain('vegetarian');
      expect(dietIds).toContain('vegan');
      expect(dietIds).toContain('high-protein');
    });
  });

  describe('isPredefinedTag', () => {
    it('returns true for predefined tag IDs', () => {
      expect(isPredefinedTag('breakfast')).toBe(true);
      expect(isPredefinedTag('vegetarian')).toBe(true);
      expect(isPredefinedTag('italian')).toBe(true);
      expect(isPredefinedTag('quick')).toBe(true);
    });

    it('returns false for custom tag IDs', () => {
      expect(isPredefinedTag('my-custom-tag')).toBe(false);
      expect(isPredefinedTag('random-tag')).toBe(false);
      expect(isPredefinedTag('')).toBe(false);
    });
  });

  describe('getTagCategory', () => {
    it('returns category for predefined tags', () => {
      expect(getTagCategory('breakfast')).toBe('meal');
      expect(getTagCategory('vegetarian')).toBe('diet');
      expect(getTagCategory('italian')).toBe('cuisine');
      expect(getTagCategory('salads')).toBe('category');
      expect(getTagCategory('quick')).toBe('effort');
    });

    it('returns undefined for custom tags', () => {
      expect(getTagCategory('my-custom-tag')).toBeUndefined();
      expect(getTagCategory('random')).toBeUndefined();
    });
  });

  describe('getTagColorClass', () => {
    it('returns category color for predefined tags', () => {
      const mealColor = getTagColorClass('breakfast');
      expect(mealColor).toBe(CATEGORY_COLORS.meal);

      const dietColor = getTagColorClass('vegetarian');
      expect(dietColor).toBe(CATEGORY_COLORS.diet);
    });

    it('returns emerald color for custom tags', () => {
      const customColor = getTagColorClass('my-custom-tag');
      expect(customColor).toBe('bg-emerald-500/10 text-emerald-400');
    });
  });

  describe('getGroupedPredefinedTags', () => {
    it('returns tags grouped by category in order', () => {
      const grouped = getGroupedPredefinedTags();

      // Should have entries for each category
      expect(grouped.length).toBe(TAG_CATEGORY_ORDER.length);

      // Categories should be in order
      for (let i = 0; i < TAG_CATEGORY_ORDER.length; i++) {
        expect(grouped[i][0]).toBe(TAG_CATEGORY_ORDER[i]);
      }
    });

    it('each group contains only tags of that category', () => {
      const grouped = getGroupedPredefinedTags();

      for (const [category, tags] of grouped) {
        for (const tag of tags) {
          expect(tag.category).toBe(category);
        }
      }
    });

    it('total tags across groups equals total predefined tags', () => {
      const grouped = getGroupedPredefinedTags();
      const totalTags = grouped.reduce((sum, [, tags]) => sum + tags.length, 0);
      expect(totalTags).toBe(PREDEFINED_TAGS.length);
    });
  });
});
