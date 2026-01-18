"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCollectionModal } from "./AddToCollectionModal";

interface RecipeActionButtonsProps {
  recipeSlug: string;
  recipeName: string;
  editLabel: string;
  shareLabel: string;
}

/**
 * Client component for recipe action buttons (Edit, Add to Collection, Share).
 */
export function RecipeActionButtons({
  recipeSlug,
  recipeName,
  editLabel,
  shareLabel,
}: RecipeActionButtonsProps) {
  const [showAddToCollectionModal, setShowAddToCollectionModal] =
    useState(false);

  return (
    <>
      <div className="flex gap-2">
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
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-500"
          title="Coming soon"
        >
          {shareLabel}
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
    </>
  );
}
