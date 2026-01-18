/**
 * Predefined tag system for recipe categorization
 *
 * Tags are organized into categories for better UX:
 * - meal: Meal type (breakfast, lunch, dinner, etc.)
 * - diet: Dietary preferences (vegetarian, vegan, keto, etc.)
 * - cuisine: Cuisine type (German, Italian, Asian, etc.)
 * - category: Recipe category (salads, meats, soups, etc.)
 * - effort: Effort level (quick, easy, meal-prep, etc.)
 */

export type TagCategory = 'meal' | 'diet' | 'cuisine' | 'category' | 'effort';

export interface PredefinedTag {
  /** Unique identifier stored in database (lowercase, hyphenated) */
  id: string;
  /** Display label (German) */
  label: string;
  /** English label for fallback/translation */
  labelEn: string;
  /** Category for grouping */
  category: TagCategory;
}

export interface TagCategoryInfo {
  label: string;
  labelEn: string;
}

export const TAG_CATEGORIES: Record<TagCategory, TagCategoryInfo> = {
  meal: { label: 'Mahlzeit', labelEn: 'Meal type' },
  diet: { label: 'Ernährung', labelEn: 'Diet' },
  cuisine: { label: 'Küche', labelEn: 'Cuisine' },
  category: { label: 'Kategorie', labelEn: 'Category' },
  effort: { label: 'Aufwand', labelEn: 'Effort' },
};

/**
 * Category display order for consistent UI
 */
export const TAG_CATEGORY_ORDER: TagCategory[] = [
  'meal',
  'diet',
  'cuisine',
  'category',
  'effort',
];

/**
 * Category-specific colors for tag display
 * Each category has a unique color to help users visually distinguish tags
 */
export const CATEGORY_COLORS: Record<TagCategory, string> = {
  meal: 'bg-blue-500/10 text-blue-400',
  diet: 'bg-green-500/10 text-green-400',
  cuisine: 'bg-orange-500/10 text-orange-400',
  category: 'bg-purple-500/10 text-purple-400',
  effort: 'bg-yellow-500/10 text-yellow-400',
};

/**
 * All predefined tags organized by category
 */
export const PREDEFINED_TAGS: PredefinedTag[] = [
  // Meal type
  { id: 'breakfast', label: 'Frühstück', labelEn: 'Breakfast', category: 'meal' },
  { id: 'lunch', label: 'Mittagessen', labelEn: 'Lunch', category: 'meal' },
  { id: 'dinner', label: 'Abendessen', labelEn: 'Dinner', category: 'meal' },
  { id: 'snack', label: 'Snack', labelEn: 'Snack', category: 'meal' },
  { id: 'dessert', label: 'Dessert', labelEn: 'Dessert', category: 'meal' },

  // Diet
  { id: 'vegetarian', label: 'Vegetarisch', labelEn: 'Vegetarian', category: 'diet' },
  { id: 'vegan', label: 'Vegan', labelEn: 'Vegan', category: 'diet' },
  { id: 'keto', label: 'Keto', labelEn: 'Keto', category: 'diet' },
  { id: 'paleo', label: 'Paleo', labelEn: 'Paleo', category: 'diet' },
  { id: 'high-protein', label: 'Proteinreich', labelEn: 'High-Protein', category: 'diet' },
  { id: 'low-carb', label: 'Low-Carb', labelEn: 'Low-Carb', category: 'diet' },

  // Cuisine
  { id: 'german', label: 'Deutsch', labelEn: 'German', category: 'cuisine' },
  { id: 'italian', label: 'Italienisch', labelEn: 'Italian', category: 'cuisine' },
  { id: 'asian', label: 'Asiatisch', labelEn: 'Asian', category: 'cuisine' },
  { id: 'mexican', label: 'Mexikanisch', labelEn: 'Mexican', category: 'cuisine' },
  { id: 'mediterranean', label: 'Mediterran', labelEn: 'Mediterranean', category: 'cuisine' },

  // Category
  { id: 'salads', label: 'Salate', labelEn: 'Salads', category: 'category' },
  { id: 'meats', label: 'Fleischgerichte', labelEn: 'Meats', category: 'category' },
  { id: 'noodles', label: 'Nudelgerichte', labelEn: 'Noodles', category: 'category' },
  { id: 'soups', label: 'Suppen', labelEn: 'Soups', category: 'category' },
  { id: 'baked', label: 'Backwaren', labelEn: 'Baked', category: 'category' },
  { id: 'drinks', label: 'Getränke', labelEn: 'Drinks', category: 'category' },

  // Effort
  { id: 'quick', label: 'Schnell', labelEn: 'Quick', category: 'effort' },
  { id: 'easy', label: 'Einfach', labelEn: 'Easy', category: 'effort' },
  { id: 'meal-prep', label: 'Meal-Prep', labelEn: 'Meal-Prep', category: 'effort' },
  { id: 'weekend-project', label: 'Wochenendprojekt', labelEn: 'Weekend-Project', category: 'effort' },
];

// Pre-computed lookup map for O(1) access
const tagByIdMap = new Map<string, PredefinedTag>(
  PREDEFINED_TAGS.map(tag => [tag.id, tag])
);

// Pre-computed set for O(1) membership check
const predefinedTagIdSet = new Set<string>(PREDEFINED_TAGS.map(t => t.id));

/**
 * Get all predefined tag IDs
 */
export function getPredefinedTagIds(): string[] {
  return PREDEFINED_TAGS.map(t => t.id);
}

/**
 * Get a predefined tag by its ID
 * @param id Tag ID to look up
 * @returns PredefinedTag if found, undefined otherwise
 */
export function getTagById(id: string): PredefinedTag | undefined {
  return tagByIdMap.get(id);
}

/**
 * Get all predefined tags in a specific category
 * @param category Category to filter by
 * @returns Array of tags in that category
 */
export function getTagsByCategory(category: TagCategory): PredefinedTag[] {
  return PREDEFINED_TAGS.filter(t => t.category === category);
}

/**
 * Check if a tag ID is a predefined tag
 * @param id Tag ID to check
 * @returns true if predefined, false if custom
 */
export function isPredefinedTag(id: string): boolean {
  return predefinedTagIdSet.has(id);
}

/**
 * Get the category of a tag (predefined or custom)
 * @param id Tag ID
 * @returns TagCategory if predefined, undefined if custom
 */
export function getTagCategory(id: string): TagCategory | undefined {
  return tagByIdMap.get(id)?.category;
}

/**
 * Get the display color class for a tag
 * @param id Tag ID
 * @returns Tailwind color classes, defaults to emerald for custom tags
 */
export function getTagColorClass(id: string): string {
  const category = getTagCategory(id);
  if (category) {
    return CATEGORY_COLORS[category];
  }
  // Default color for custom tags
  return 'bg-emerald-500/10 text-emerald-400';
}

/**
 * Get grouped predefined tags by category in display order
 * @returns Array of [category, tags] tuples
 */
export function getGroupedPredefinedTags(): [TagCategory, PredefinedTag[]][] {
  return TAG_CATEGORY_ORDER.map(category => [
    category,
    getTagsByCategory(category),
  ]);
}
