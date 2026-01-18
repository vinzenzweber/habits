"use client";

import { useState, useEffect } from "react";
import type { RecipeJson } from "@/lib/recipe-types";

// Supported translation locales (copied from recipe-tools to avoid server import)
export const SUPPORTED_TRANSLATION_LOCALES = [
  'de-DE', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'it-IT'
] as const;

export type TranslationLocale = typeof SUPPORTED_TRANSLATION_LOCALES[number];

interface TranslateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeSlug: string;
  recipeName: string;
  recipeId: number;
  currentLocale: string;
  onSuccess?: (translatedSlug: string) => void;
  translations: {
    title: string;
    translatingRecipe: string;
    selectLanguage: string;
    adaptMeasurements: string;
    adaptMeasurementsDescription: string;
    preview: string;
    saveTranslation: string;
    translating: string;
    translationPreview: string;
    close: string;
    cancel: string;
  };
}

// Locale display names
const LOCALE_NAMES: Record<string, string> = {
  'de-DE': 'Deutsch (DE)',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Español (ES)',
  'fr-FR': 'Français (FR)',
  'it-IT': 'Italiano (IT)',
};

/**
 * Modal for translating a recipe to a different language.
 * Allows preview before saving.
 */
export function TranslateRecipeModal({
  isOpen,
  onClose,
  recipeName,
  recipeId,
  currentLocale,
  onSuccess,
  translations: t,
}: TranslateRecipeModalProps) {
  const [targetLocale, setTargetLocale] = useState<TranslationLocale | "">("");
  const [adaptMeasurements, setAdaptMeasurements] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<RecipeJson | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter out current locale from options
  const availableLocales = SUPPORTED_TRANSLATION_LOCALES.filter(
    locale => locale !== currentLocale
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTargetLocale("");
      setAdaptMeasurements(true);
      setError(null);
      setPreviewData(null);
      setIsLoading(false);
      setIsSaving(false);
    }
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePreview = async () => {
    if (!targetLocale) return;

    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const response = await fetch(`/api/recipes/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          targetLocale,
          adaptMeasurements,
          saveAsNew: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Translation failed");
      }

      const { translatedRecipe } = await response.json();
      setPreviewData(translatedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!targetLocale) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          targetLocale,
          adaptMeasurements,
          saveAsNew: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save translation");
      }

      const { translatedRecipe } = await response.json();
      onSuccess?.(translatedRecipe.slug);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="translate-recipe-title"
        className={`fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[480px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 id="translate-recipe-title" className="text-lg font-semibold">
            {t.title}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Recipe name */}
          <p className="mb-4 text-sm text-slate-400">
            {t.translatingRecipe}: &quot;{recipeName}&quot;
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!previewData ? (
            <>
              {/* Language selector */}
              <div className="mb-4">
                <label
                  htmlFor="target-locale"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  {t.selectLanguage}
                </label>
                <select
                  id="target-locale"
                  value={targetLocale}
                  onChange={(e) => setTargetLocale(e.target.value as TranslationLocale)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Select language --</option>
                  {availableLocales.map((locale) => (
                    <option key={locale} value={locale}>
                      {LOCALE_NAMES[locale] || locale}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adapt measurements checkbox */}
              <div className="mb-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={adaptMeasurements}
                    onChange={(e) => setAdaptMeasurements(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span className="block font-medium text-white">
                      {t.adaptMeasurements}
                    </span>
                    <span className="block text-sm text-slate-400">
                      {t.adaptMeasurementsDescription}
                    </span>
                  </div>
                </label>
              </div>
            </>
          ) : (
            /* Preview section */
            <div className="space-y-4">
              <h3 className="font-semibold text-emerald-400">
                {t.translationPreview}
              </h3>

              {/* Title preview */}
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">Title</p>
                <p className="text-lg font-medium text-white">{previewData.title}</p>
              </div>

              {/* Description preview */}
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">Description</p>
                <p className="text-slate-300">{previewData.description}</p>
              </div>

              {/* Sample ingredients */}
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Ingredients (sample)
                </p>
                {previewData.ingredientGroups.slice(0, 1).map((group, idx) => (
                  <div key={idx} className="mt-2">
                    <p className="text-sm font-medium text-emerald-300">{group.name}</p>
                    <ul className="mt-1 space-y-1">
                      {group.ingredients.slice(0, 3).map((ing, i) => (
                        <li key={i} className="text-sm text-slate-300">
                          {ing.quantity} {ing.unit} {ing.name}
                        </li>
                      ))}
                      {group.ingredients.length > 3 && (
                        <li className="text-sm italic text-slate-500">
                          ... and {group.ingredients.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Sample steps */}
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Steps (sample)
                </p>
                <ol className="mt-2 space-y-2">
                  {previewData.steps.slice(0, 2).map((step) => (
                    <li key={step.number} className="flex gap-2 text-sm">
                      <span className="font-medium text-emerald-300">{step.number}.</span>
                      <span className="text-slate-300">{step.instruction}</span>
                    </li>
                  ))}
                  {previewData.steps.length > 2 && (
                    <li className="text-sm italic text-slate-500">
                      ... and {previewData.steps.length - 2} more steps
                    </li>
                  )}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          {!previewData ? (
            <>
              <button
                onClick={handlePreview}
                disabled={!targetLocale || isLoading}
                className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {t.translating}
                  </span>
                ) : (
                  t.preview
                )}
              </button>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2 text-slate-400 transition hover:text-white"
              >
                {t.cancel}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  t.saveTranslation
                )}
              </button>
              <button
                onClick={() => setPreviewData(null)}
                className="mt-2 w-full py-2 text-slate-400 transition hover:text-white"
              >
                Back to options
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
