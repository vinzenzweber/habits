"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AddToCollectionModal } from "./AddToCollectionModal";
import { AddToGroceryListModal } from "./AddToGroceryListModal";
import { TranslateRecipeModal } from "./TranslateRecipeModal";
import { FavoriteButton } from "./FavoriteButton";

interface RecipeActionButtonsProps {
  recipeSlug: string;
  recipeName: string;
  editLabel: string;
  initialIsFavorite: boolean;
  recipeId: number;
  defaultServings: number;
  ingredientCount: number;
  currentLocale: string;
  translateLabel: string;
  translateTranslations: {
    title: string;
    translatingRecipe: string;
    selectLanguage: string;
    selectLanguagePlaceholder: string;
    adaptMeasurements: string;
    adaptMeasurementsDescription: string;
    preview: string;
    saveTranslation: string;
    translating: string;
    translationPreview: string;
    close: string;
    cancel: string;
    saving: string;
    backToOptions: string;
    titleLabel: string;
    descriptionLabel: string;
    ingredientsSample: string;
    stepsSample: string;
    andMore: string;
    andMoreSteps: string;
    translationFailed: string;
    failedToSaveTranslation: string;
  };
}

/**
 * Client component for recipe action buttons (Edit, Add to Collection, Translate).
 * Share functionality is handled by ShareRecipeSection component.
 */
export function RecipeActionButtons({
  recipeSlug,
  recipeName,
  editLabel,
  initialIsFavorite,
  recipeId,
  defaultServings,
  ingredientCount,
  currentLocale,
  translateLabel,
  translateTranslations,
}: RecipeActionButtonsProps) {
  const t = useTranslations("recipeList");
  const [showAddToCollectionModal, setShowAddToCollectionModal] =
    useState(false);
  const [showAddToGroceryListModal, setShowAddToGroceryListModal] =
    useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <FavoriteButton
          recipeSlug={recipeSlug}
          initialIsFavorite={initialIsFavorite}
          size="md"
          className="bg-slate-800 hover:bg-slate-700"
        />
        <Link
          href={`/recipes/${recipeSlug}/edit`}
          className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          {editLabel}
        </Link>
        <button
          onClick={() => setShowAddToCollectionModal(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          title={t("addToCollection")}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span className="hidden sm:inline">{t("addToCollectionLabel")}</span>
        </button>
        <button
          onClick={() => setShowAddToGroceryListModal(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          title={t("addToGroceryList")}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="hidden sm:inline">{t("addToListLabel")}</span>
        </button>
        <button
          onClick={() => setShowTranslateModal(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          title={translateLabel}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          <span className="hidden sm:inline">{translateLabel}</span>
        </button>
      </div>

      <AddToCollectionModal
        isOpen={showAddToCollectionModal}
        onClose={() => setShowAddToCollectionModal(false)}
        recipeSlug={recipeSlug}
        recipeName={recipeName}
        onSuccess={() => {
          // Success feedback could be added here
        }}
      />

      <AddToGroceryListModal
        isOpen={showAddToGroceryListModal}
        onClose={() => setShowAddToGroceryListModal(false)}
        recipeId={recipeId}
        recipeName={recipeName}
        defaultServings={defaultServings}
        ingredientCount={ingredientCount}
        onSuccess={() => {
          // Success feedback could be added here
        }}
      />

      <TranslateRecipeModal
        isOpen={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        recipeSlug={recipeSlug}
        recipeName={recipeName}
        recipeId={recipeId}
        currentLocale={currentLocale}
        translations={translateTranslations}
        onSuccess={() => {
          // Success - could navigate to translated version
        }}
      />
    </>
  );
}
