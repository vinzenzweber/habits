"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCollectionModal } from "./AddToCollectionModal";
import { AddToGroceryListModal } from "./AddToGroceryListModal";
import { FavoriteButton } from "./FavoriteButton";

interface RecipeActionButtonsProps {
  recipeSlug: string;
  recipeName: string;
  editLabel: string;
  initialIsFavorite: boolean;
  recipeId: number;
  defaultServings: number;
  ingredientCount: number;
}

/**
 * Client component for recipe action buttons (Edit, Add to Collection).
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
}: RecipeActionButtonsProps) {
  const [showAddToCollectionModal, setShowAddToCollectionModal] =
    useState(false);
  const [showAddToGroceryListModal, setShowAddToGroceryListModal] =
    useState(false);

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
          title="Add to collection"
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
          <span className="hidden sm:inline">Add to Collection</span>
        </button>
        <button
          onClick={() => setShowAddToGroceryListModal(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          title="Add to grocery list"
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
          <span className="hidden sm:inline">Add to List</span>
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
    </>
  );
}
