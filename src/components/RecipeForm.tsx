'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RecipeImageUpload } from './RecipeImageUpload';
import { TagInput } from './TagInput';
import { IngredientGroupEditor } from './IngredientGroupEditor';
import { StepsEditor } from './StepsEditor';
import type {
  RecipeJson,
  RecipeImage,
  IngredientGroup,
  RecipeStep,
  NutritionInfo,
} from '@/lib/recipe-types';
import { generateSlug } from '@/lib/recipe-types';
import type { PredefinedTag, TagCategory, TagCategoryInfo } from '@/lib/predefined-tags';

interface RecipeFormProps {
  /** Initial recipe data for editing, undefined for new recipe */
  initialRecipe?: RecipeJson;
  /** Recipe slug for editing, undefined for new recipe */
  slug?: string;
  /** Available tags for autocomplete */
  existingTags?: string[];
  /** Predefined tags with category metadata */
  predefinedTags?: PredefinedTag[];
  /** Category metadata for UI grouping */
  tagCategories?: Partial<Record<TagCategory, TagCategoryInfo>>;
  /** Default locale for new recipes (from user preferences) */
  defaultLocale?: string;
  /** Initial image URL (from photo capture redirect) */
  initialImageUrl?: string;
}

interface FormState {
  title: string;
  description: string;
  tags: string[];
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  nutrition: NutritionInfo;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  images: RecipeImage[];
}

const DEFAULT_NUTRITION: NutritionInfo = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
};

const DEFAULT_FORM_STATE: FormState = {
  title: '',
  description: '',
  tags: [],
  servings: 2,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  nutrition: DEFAULT_NUTRITION,
  ingredientGroups: [{ name: '', ingredients: [{ name: '', quantity: 0, unit: '' }] }],
  steps: [{ number: 1, instruction: '' }],
  images: [],
};

export function RecipeForm({
  initialRecipe,
  slug,
  existingTags = [],
  predefinedTags = [],
  tagCategories = {},
  defaultLocale = 'en-US',
  initialImageUrl,
}: RecipeFormProps) {
  const router = useRouter();
  const t = useTranslations('recipeFormLabels');
  const tValidation = useTranslations('recipeForm');
  const tCommon = useTranslations('common');
  const tRecipes = useTranslations('recipes');
  const tErrors = useTranslations('errors');
  const isEditing = Boolean(slug);

  const [form, setForm] = useState<FormState>(() => {
    if (initialRecipe) {
      return {
        title: initialRecipe.title,
        description: initialRecipe.description,
        tags: initialRecipe.tags,
        servings: initialRecipe.servings,
        prepTimeMinutes: initialRecipe.prepTimeMinutes ?? null,
        cookTimeMinutes: initialRecipe.cookTimeMinutes ?? null,
        nutrition: initialRecipe.nutrition,
        ingredientGroups: initialRecipe.ingredientGroups,
        steps: initialRecipe.steps,
        images: initialRecipe.images,
      };
    }
    // If initialImageUrl is provided (from photo capture), pre-populate images
    if (initialImageUrl) {
      return {
        ...DEFAULT_FORM_STATE,
        images: [{ url: initialImageUrl, isPrimary: true }],
      };
    }
    return DEFAULT_FORM_STATE;
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Note: We intentionally do NOT use a useEffect to sync form state with initialRecipe.
  // The initialRecipe prop is only used once during initial state creation (via useState's
  // initializer function). This prevents potential data loss if the prop updates unexpectedly
  // while the user has unsaved changes. If initialRecipe changes (e.g., route transition),
  // React will remount the component anyway, re-running the useState initializer.

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateNutrition = useCallback((field: keyof NutritionInfo, value: number) => {
    setForm((prev) => ({
      ...prev,
      nutrition: { ...prev.nutrition, [field]: value },
    }));
  }, []);

  const validate = useCallback((): string | null => {
    if (!form.title.trim()) {
      return tValidation('titleRequired');
    }
    if (!form.description.trim()) {
      return tValidation('descriptionRequired');
    }
    if (form.images.length === 0) {
      return tValidation('imageRequired');
    }
    if (form.servings < 1) {
      return tValidation('servingsMin');
    }
    // Check ingredients
    const hasIngredients = form.ingredientGroups.some((g) =>
      g.ingredients.some((i) => i.name.trim())
    );
    if (!hasIngredients) {
      return tValidation('ingredientRequired');
    }
    // Check steps
    const hasSteps = form.steps.some((s) => s.instruction.trim());
    if (!hasSteps) {
      return tValidation('stepRequired');
    }
    return null;
  }, [form, tValidation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Clean up ingredient groups (remove empty entries)
      const cleanedGroups = form.ingredientGroups
        .map((group) => ({
          ...group,
          ingredients: group.ingredients.filter((i) => i.name.trim()),
        }))
        .filter((group) => group.ingredients.length > 0);

      // Clean up steps (remove empty entries)
      const cleanedSteps = form.steps
        .filter((s) => s.instruction.trim())
        .map((s, i) => ({ ...s, number: i + 1 }));

      // Build recipe JSON
      // Note: When editing, we preserve the original slug for URL stability.
      // This means the URL won't change even if the title changes significantly.
      // This is intentional to prevent broken bookmarks/links.
      const recipeJson: RecipeJson = {
        slug: slug || generateSlug(form.title),
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags,
        servings: form.servings,
        prepTimeMinutes: form.prepTimeMinutes ?? undefined,
        cookTimeMinutes: form.cookTimeMinutes ?? undefined,
        nutrition: form.nutrition,
        ingredientGroups: cleanedGroups,
        steps: cleanedSteps,
        images: form.images,
        locale: defaultLocale,
        sourceType: 'manual',
      };

      const endpoint = isEditing ? `/api/recipes/${slug}` : '/api/recipes';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipeJson.title,
          description: recipeJson.description,
          tags: recipeJson.tags,
          recipeJson,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tErrors('failedToSaveRecipe'));
      }

      // Redirect to recipe detail page
      router.push(`/recipes/${data.recipe.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToSave'));
    } finally {
      setLoading(false);
    }
  }, [form, slug, isEditing, validate, router, defaultLocale]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 text-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {/* Basic info section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('basicInfo')}</h2>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm mb-2">
            {t('title')} <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
            maxLength={200}
            disabled={loading}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
            placeholder={t('titlePlaceholder')}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm mb-2">
            {t('description')} <span className="text-red-400">*</span>
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            required
            maxLength={1000}
            disabled={loading}
            rows={3}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none resize-none disabled:opacity-50"
            placeholder={t('descriptionPlaceholder')}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm mb-2">{t('tags')}</label>
          <TagInput
            tags={form.tags}
            onChange={(tags) => updateField('tags', tags)}
            suggestions={existingTags}
            predefinedTags={predefinedTags}
            categories={tagCategories}
            disabled={loading}
          />
        </div>
      </section>

      {/* Images section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t('images')} <span className="text-red-400">*</span>
        </h2>
        <RecipeImageUpload
          images={form.images}
          onChange={(images) => updateField('images', images)}
          disabled={loading}
          onUploadingChange={setIsUploading}
        />
      </section>

      {/* Time and servings section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('timeAndServings')}</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Prep time */}
          <div>
            <label htmlFor="prepTime" className="block text-sm mb-2">
              {t('prepTimeMin')}
            </label>
            <input
              id="prepTime"
              type="number"
              min="0"
              value={form.prepTimeMinutes ?? ''}
              onChange={(e) =>
                updateField('prepTimeMinutes', e.target.value ? parseInt(e.target.value) : null)
              }
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Cook time */}
          <div>
            <label htmlFor="cookTime" className="block text-sm mb-2">
              {t('cookTimeMin')}
            </label>
            <input
              id="cookTime"
              type="number"
              min="0"
              value={form.cookTimeMinutes ?? ''}
              onChange={(e) =>
                updateField('cookTimeMinutes', e.target.value ? parseInt(e.target.value) : null)
              }
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Servings */}
          <div>
            <label htmlFor="servings" className="block text-sm mb-2">
              {tRecipes('servings')} <span className="text-red-400">*</span>
            </label>
            <input
              id="servings"
              type="number"
              min="1"
              max="100"
              value={form.servings}
              onChange={(e) => updateField('servings', parseInt(e.target.value) || 1)}
              required
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      {/* Nutrition section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('nutritionPerServing')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Calories */}
          <div>
            <label htmlFor="calories" className="block text-sm mb-2">
              {t('calories')}
            </label>
            <input
              id="calories"
              type="number"
              min="0"
              value={form.nutrition.calories || ''}
              onChange={(e) => updateNutrition('calories', parseFloat(e.target.value) || 0)}
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Protein */}
          <div>
            <label htmlFor="protein" className="block text-sm mb-2">
              {t('proteinG')}
            </label>
            <input
              id="protein"
              type="number"
              min="0"
              step="0.1"
              value={form.nutrition.protein || ''}
              onChange={(e) => updateNutrition('protein', parseFloat(e.target.value) || 0)}
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Carbs */}
          <div>
            <label htmlFor="carbs" className="block text-sm mb-2">
              {t('carbsG')}
            </label>
            <input
              id="carbs"
              type="number"
              min="0"
              step="0.1"
              value={form.nutrition.carbohydrates || ''}
              onChange={(e) => updateNutrition('carbohydrates', parseFloat(e.target.value) || 0)}
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Fat */}
          <div>
            <label htmlFor="fat" className="block text-sm mb-2">
              {t('fatG')}
            </label>
            <input
              id="fat"
              type="number"
              min="0"
              step="0.1"
              value={form.nutrition.fat || ''}
              onChange={(e) => updateNutrition('fat', parseFloat(e.target.value) || 0)}
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* Ingredients section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {tRecipes('ingredients')} <span className="text-red-400">*</span>
        </h2>
        <IngredientGroupEditor
          groups={form.ingredientGroups}
          onChange={(groups) => updateField('ingredientGroups', groups)}
          disabled={loading}
        />
      </section>

      {/* Steps section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t('steps')} <span className="text-red-400">*</span>
        </h2>
        <StepsEditor
          steps={form.steps}
          onChange={(steps) => updateField('steps', steps)}
          disabled={loading}
        />
      </section>

      {/* Submit buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="flex-1 py-3 rounded bg-slate-700 hover:bg-slate-600 transition font-medium disabled:opacity-50"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading || isUploading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded font-medium transition disabled:opacity-50"
        >
          {loading ? tCommon('saving') : isUploading ? t('uploadingImages') : isEditing ? t('saveChanges') : t('createRecipe')}
        </button>
      </div>
    </form>
  );
}
