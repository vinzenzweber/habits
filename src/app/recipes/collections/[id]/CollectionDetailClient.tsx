"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Collection, CollectionWithRecipes } from "@/lib/collection-types";
import { RecipeSummary } from "@/lib/recipe-types";
import { CollectionRecipeList } from "@/components/CollectionRecipeList";
import { CreateCollectionModal } from "@/components/CreateCollectionModal";
import { ShareCollectionModal } from "@/components/ShareCollectionModal";

interface CollectionDetailClientProps {
  initialCollection: CollectionWithRecipes;
  sharedBy?: { id: number; name: string; email: string };
}

/**
 * Client component for collection detail page.
 * Handles editing, sharing, and recipe management interactions.
 */
export function CollectionDetailClient({
  initialCollection,
  sharedBy,
}: CollectionDetailClientProps) {
  const router = useRouter();
  const [collection, setCollection] =
    useState<CollectionWithRecipes>(initialCollection);
  const [recipes, setRecipes] = useState<RecipeSummary[]>(
    initialCollection.recipes
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasImage = collection.coverImageUrl && !imageError;

  const handleCollectionSaved = (updatedCollection: Collection) => {
    // If it was updated, refresh the collection data
    setCollection((prev) => ({
      ...prev,
      name: updatedCollection.name,
      description: updatedCollection.description,
      coverImageUrl: updatedCollection.coverImageUrl,
    }));
  };

  const handleRecipeRemoved = (recipeSlug: string) => {
    setRecipes((prev) => prev.filter((r) => r.slug !== recipeSlug));
    setCollection((prev) => ({
      ...prev,
      recipeCount: prev.recipeCount - 1,
    }));
  };

  const handleAddRecipeSuccess = () => {
    // Refresh the page to get updated recipe list
    router.refresh();
  };

  return (
    <>
      {/* Collection Header */}
      <div className="space-y-4">
        {/* Cover image */}
        {hasImage ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-800">
            <Image
              src={collection.coverImageUrl!}
              alt={collection.name}
              fill
              className="object-cover"
              unoptimized
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-800 text-6xl">
            📁
          </div>
        )}

        {/* Title and actions */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-sm text-slate-300 sm:text-base">
                {collection.description}
              </p>
            )}

            {/* Shared by badge */}
            {sharedBy && (
              <p className="text-sm text-emerald-400">
                Shared by {sharedBy.name}
              </p>
            )}

            {/* Recipe count */}
            <p className="text-sm text-slate-400">
              {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Edit
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Add recipe button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setShowAddRecipeModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Recipe
        </button>
      </div>

      {/* Recipe list */}
      <CollectionRecipeList
        recipes={recipes}
        collectionId={collection.id}
        onRecipeRemoved={handleRecipeRemoved}
        isOwner={true}
      />

      {/* Edit Modal */}
      <CreateCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleCollectionSaved}
        onDelete={() => {
          // Navigate to collections list after deletion
          router.push("/recipes/collections");
          router.refresh();
        }}
        editingCollection={collection}
      />

      {/* Share Modal */}
      <ShareCollectionModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        collection={collection}
        onShareSuccess={() => {
          // Optionally refresh to show updated share status
          router.refresh();
        }}
      />

      {/* Add Recipe Modal - shows user's recipes to add */}
      {showAddRecipeModal && (
        <AddRecipeToCollectionModal
          isOpen={showAddRecipeModal}
          onClose={() => setShowAddRecipeModal(false)}
          collectionId={collection.id}
          collectionName={collection.name}
          existingRecipeSlugs={recipes.map((r) => r.slug)}
          onSuccess={handleAddRecipeSuccess}
        />
      )}
    </>
  );
}

/**
 * Modal for adding recipes from user's library to this collection
 */
function AddRecipeToCollectionModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  existingRecipeSlugs,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  collectionName: string;
  existingRecipeSlugs: string[];
  onSuccess: () => void;
}) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  // Fetch user's recipes when modal opens
  useEffect(() => {
    const fetchRecipes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/recipes");
        if (!response.ok) throw new Error("Failed to fetch recipes");
        const data = await response.json();
        // Filter out recipes already in collection
        const available = data.recipes.filter(
          (r: RecipeSummary) => !existingRecipeSlugs.includes(r.slug)
        );
        setRecipes(available);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      fetchRecipes();
    }
  }, [isOpen, existingRecipeSlugs]);

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

  const toggleRecipe = (slug: string) => {
    setSelectedSlugs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) {
        newSet.delete(slug);
      } else {
        newSet.add(slug);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (selectedSlugs.size === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);

    const failedRecipes: string[] = [];

    try {
      // Get recipe IDs and add each to collection
      for (const slug of selectedSlugs) {
        try {
          // Get recipe ID
          const recipeRes = await fetch(`/api/recipes/${slug}`);
          if (!recipeRes.ok) {
            failedRecipes.push(slug);
            continue;
          }
          const recipeData = await recipeRes.json();

          // Add to collection
          const addRes = await fetch(`/api/collections/${collectionId}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId: recipeData.recipe.id }),
          });

          if (!addRes.ok) {
            failedRecipes.push(recipeData.recipe.title || slug);
          }
        } catch {
          failedRecipes.push(slug);
        }
      }

      if (failedRecipes.length > 0) {
        if (failedRecipes.length === selectedSlugs.size) {
          // All failed
          setError(`Failed to add recipes: ${failedRecipes.join(", ")}`);
        } else {
          // Partial failure - still close but show what failed
          setError(`Some recipes could not be added: ${failedRecipes.join(", ")}`);
          onSuccess();
          onClose();
        }
      } else {
        onSuccess();
        onClose();
      }
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
        aria-labelledby="add-recipes-title"
        className={`fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[450px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 id="add-recipes-title" className="text-lg font-semibold">Add Recipes</h2>
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
          <p className="mb-4 text-sm text-slate-400">
            Select recipes to add to &quot;{collectionName}&quot;
          </p>

          {error && (
            <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : recipes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              All your recipes are already in this collection
            </p>
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.slug}
                  onClick={() => toggleRecipe(recipe.slug)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selectedSlugs.has(recipe.slug)
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selectedSlugs.has(recipe.slug)
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-600"
                    }`}
                  >
                    {selectedSlugs.has(recipe.slug) && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Recipe thumbnail */}
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-700">
                    {recipe.primaryImage?.url ? (
                      <Image
                        src={recipe.primaryImage.url}
                        alt={recipe.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-lg">
                        🍳
                      </span>
                    )}
                  </div>

                  {/* Recipe info */}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-white">
                      {recipe.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Adding..."
              : selectedSlugs.size > 0
                ? `Add ${selectedSlugs.size} Recipe${selectedSlugs.size !== 1 ? "s" : ""}`
                : "Done"}
          </button>
          <button
            onClick={onClose}
            className="mt-2 w-full py-2 text-slate-400 transition hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
