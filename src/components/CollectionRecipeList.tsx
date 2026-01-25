"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RecipeSummary } from "@/lib/recipe-types";
import { RecipeCard } from "./RecipeCard";


interface CollectionRecipeListProps {
  recipes: RecipeSummary[];
  collectionId: number;
  onRecipeRemoved: (recipeSlug: string) => void;
  isOwner: boolean;
}

/**
 * Recipe grid for collection detail page with remove capability.
 * Uses RecipeCard components with optional remove button overlay.
 */
export function CollectionRecipeList({
  recipes,
  collectionId,
  onRecipeRemoved,
  isOwner,
}: CollectionRecipeListProps) {
  const t = useTranslations("collections");
  const tCommon = useTranslations("common");
  const tAddToCollection = useTranslations("addToCollection");
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (recipe: RecipeSummary) => {
    if (confirmSlug !== recipe.slug) {
      setConfirmSlug(recipe.slug);
      return;
    }

    setRemovingSlug(recipe.slug);
    setError(null);

    try {
      // First, get the recipe ID from the slug
      const recipeRes = await fetch(`/api/recipes/${recipe.slug}`);
      if (!recipeRes.ok) {
        throw new Error(tAddToCollection("recipeNotFound"));
      }
      const recipeData = await recipeRes.json();

      // Remove from collection
      const response = await fetch(
        `/api/collections/${collectionId}/recipes/${recipeData.recipe.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("failedToRemove"));
      }

      onRecipeRemoved(recipe.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setRemovingSlug(null);
      setConfirmSlug(null);
    }
  };

  const cancelRemove = () => {
    setConfirmSlug(null);
  };

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-12 text-center">
        <span className="mb-2 text-4xl">📚</span>
        <p className="mb-1 text-slate-300">{t("noRecipesInCollection")}</p>
        <p className="text-sm text-slate-500">
          {t("addRecipesFromLibrary")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="rounded bg-red-500/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Recipe grid */}
      <div className="flex flex-col gap-4">
        {recipes.map((recipe) => (
          <div key={recipe.slug} className="relative">
            <RecipeCard recipe={recipe} />

            {/* Remove button overlay - only show for owner */}
            {isOwner && (
              <div className="absolute right-2 top-2">
                {confirmSlug === recipe.slug ? (
                  <div className="flex gap-1 rounded-lg bg-slate-900/90 p-1 backdrop-blur">
                    <button
                      onClick={() => handleRemove(recipe)}
                      disabled={removingSlug === recipe.slug}
                      className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-400 disabled:opacity-50"
                    >
                      {removingSlug === recipe.slug ? "..." : t("remove")}
                    </button>
                    <button
                      onClick={cancelRemove}
                      className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRemove(recipe)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-400 backdrop-blur transition hover:bg-slate-800 hover:text-red-400"
                    aria-label={t("removeFromCollectionLabel", { title: recipe.title })}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
