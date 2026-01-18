"use client";

import { useState, useEffect, useCallback } from "react";
import { CollectionSummary } from "@/lib/collection-types";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeSlug: string;
  recipeName: string;
  onSuccess?: () => void;
}

type CollectionState = CollectionSummary & {
  isSelected: boolean;
  wasAlreadyAdded: boolean;
};

/**
 * Modal for adding a recipe to one or more collections.
 * Shows list of user's collections with checkboxes.
 */
export function AddToCollectionModal({
  isOpen,
  onClose,
  recipeSlug,
  recipeName,
  onSuccess,
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<CollectionState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [recipeId, setRecipeId] = useState<number | null>(null);

  // Fetch collections and recipe data when modal opens
  const fetchData = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch collections and recipe in parallel
      const [collectionsRes, recipeRes] = await Promise.all([
        fetch("/api/collections"),
        fetch(`/api/recipes/${recipeSlug}`),
      ]);

      if (!collectionsRes.ok) {
        throw new Error("Failed to fetch collections");
      }
      if (!recipeRes.ok) {
        throw new Error("Recipe not found");
      }

      const collectionsData = await collectionsRes.json();
      const recipeData = await recipeRes.json();

      setRecipeId(recipeData.recipe.id);

      // For each collection, check if the recipe is already in it
      const collectionsWithState = await Promise.all(
        collectionsData.collections.map(
          async (collection: CollectionSummary) => {
            // Fetch collection details to check if recipe is already added
            const detailRes = await fetch(`/api/collections/${collection.id}`);
            if (detailRes.ok) {
              const detail = await detailRes.json();
              const isAlreadyAdded = detail.collection.recipes?.some(
                (r: { slug: string }) => r.slug === recipeSlug
              );
              return {
                ...collection,
                isSelected: isAlreadyAdded,
                wasAlreadyAdded: isAlreadyAdded,
              };
            }
            return {
              ...collection,
              isSelected: false,
              wasAlreadyAdded: false,
            };
          }
        )
      );

      setCollections(collectionsWithState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, recipeSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowCreateForm(false);
      setNewCollectionName("");
      setError(null);
    }
  }, [isOpen]);

  const toggleCollection = (collectionId: number) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId && !c.wasAlreadyAdded
          ? { ...c, isSelected: !c.isSelected }
          : c
      )
    );
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create collection");
      }

      const { collection } = await response.json();

      // Add new collection to list, selected by default
      setCollections((prev) => [
        {
          ...collection,
          isSelected: true,
          wasAlreadyAdded: false,
        },
        ...prev,
      ]);

      setShowCreateForm(false);
      setNewCollectionName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleSave = async () => {
    if (recipeId === null) return;

    setIsSaving(true);
    setError(null);

    try {
      // Find collections that need to be added (newly selected)
      const collectionsToAdd = collections.filter(
        (c) => c.isSelected && !c.wasAlreadyAdded
      );

      // Add recipe to each selected collection
      for (const collection of collectionsToAdd) {
        const response = await fetch(
          `/api/collections/${collection.id}/recipes`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          // Ignore "already in collection" errors
          if (!data.error?.includes("already")) {
            throw new Error(
              data.error || `Failed to add to ${collection.name}`
            );
          }
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasChanges = collections.some(
    (c) => c.isSelected && !c.wasAlreadyAdded
  );

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
        className={`fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[400px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold">Add to Collection</h2>
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
            Adding &quot;{recipeName}&quot;
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Create new collection form */}
              {showCreateForm ? (
                <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name"
                    maxLength={100}
                    className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCollection}
                      disabled={!newCollectionName.trim()}
                      className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCollectionName("");
                      }}
                      className="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium text-white hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 py-3 text-sm text-slate-400 transition hover:border-slate-600 hover:text-white"
                >
                  <span>+</span> Create New Collection
                </button>
              )}

              {/* Collection list */}
              {collections.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  No collections yet. Create one above!
                </p>
              ) : (
                collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => toggleCollection(collection.id)}
                    disabled={collection.wasAlreadyAdded}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      collection.isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    } ${collection.wasAlreadyAdded ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        collection.isSelected
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-slate-600"
                      }`}
                    >
                      {collection.isSelected && (
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

                    {/* Collection info */}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium text-white">
                        {collection.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {collection.recipeCount}{" "}
                        {collection.recipeCount === 1 ? "recipe" : "recipes"}
                        {collection.wasAlreadyAdded && " • Already added"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : hasChanges ? "Add to Selected" : "Done"}
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
