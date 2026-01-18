"use client";

import { useState, useEffect, useCallback } from "react";
import { GroceryListSummary } from "@/lib/grocery-types";

interface AddToGroceryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: number;
  recipeName: string;
  defaultServings: number;
  ingredientCount: number;
  onSuccess?: () => void;
}

/**
 * Modal for adding a recipe's ingredients to a grocery list.
 * Shows list of user's grocery lists with option to create new.
 */
export function AddToGroceryListModal({
  isOpen,
  onClose,
  recipeId,
  recipeName,
  defaultServings,
  ingredientCount,
  onSuccess,
}: AddToGroceryListModalProps) {
  const [groceryLists, setGroceryLists] = useState<GroceryListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    listId: number;
    listName: string;
    itemCount: number;
  } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Fetch grocery lists when modal opens
  const fetchLists = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/grocery-lists");
      if (!response.ok) {
        throw new Error("Failed to fetch grocery lists");
      }

      const data = await response.json();
      setGroceryLists(data.lists);

      // Default to creating new list if no lists exist
      if (data.lists.length === 0) {
        setShowCreateForm(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedListId(null);
      setServingsMultiplier(1);
      setShowCreateForm(false);
      setNewListName("");
      setError(null);
      setSuccess(null);
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

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      const response = await fetch("/api/grocery-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create list");
      }

      const newList = await response.json();

      // Add new list to state and select it
      setGroceryLists((prev) => [
        {
          ...newList,
          ownerUserId: 0,
          ownerName: "",
          isOwner: true,
          permission: "owner" as const,
          itemCount: 0,
          checkedCount: 0,
          updatedAt: new Date(),
        },
        ...prev,
      ]);
      setSelectedListId(newList.id);
      setShowCreateForm(false);
      setNewListName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleGenerate = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/grocery-lists/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeIds: [recipeId],
          servingsMultiplier,
          existingListId: selectedListId || undefined,
          listName: selectedListId ? undefined : `${recipeName} Shopping List`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate grocery list");
      }

      const data = await response.json();

      setSuccess({
        listId: data.listId,
        listName: data.listName,
        itemCount: data.consolidationSummary.consolidatedItems,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Success state
  if (success) {
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
          aria-labelledby="add-to-grocery-list-title"
          className={`fixed z-50 flex flex-col bg-slate-900
            inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
            md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
            md:w-[400px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 p-4">
            <h2
              id="add-to-grocery-list-title"
              className="text-lg font-semibold"
            >
              Added to Grocery List
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
          <div className="flex-1 overflow-y-auto p-6 text-center">
            <div className="mb-4 text-4xl">✅</div>
            <p className="mb-2 text-lg font-medium text-white">
              {success.itemCount} items added
            </p>
            <p className="text-sm text-slate-400">
              Added to &quot;{success.listName}&quot;
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-4">
            <a
              href={`/grocery-lists/${success.listId}`}
              className="block w-full rounded-xl bg-emerald-500 py-3 text-center font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              View Grocery List
            </a>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 text-slate-400 transition hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

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
        aria-labelledby="add-to-grocery-list-title"
        className={`fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[400px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 id="add-to-grocery-list-title" className="text-lg font-semibold">
            Add to Grocery List
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
          {/* Recipe info */}
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-3">
            <p className="font-medium text-white">{recipeName}</p>
            <p className="text-sm text-slate-400">
              {ingredientCount} ingredients
            </p>
          </div>

          {/* Servings multiplier */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Servings
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setServingsMultiplier((v) => Math.max(0.5, v - 0.5))
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-white hover:bg-slate-700"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className="text-xl font-semibold text-white">
                  {servingsMultiplier}x
                </span>
                <span className="ml-2 text-sm text-slate-400">
                  ({Math.round(defaultServings * servingsMultiplier)} servings)
                </span>
              </div>
              <button
                onClick={() =>
                  setServingsMultiplier((v) => Math.min(10, v + 0.5))
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-white hover:bg-slate-700"
              >
                +
              </button>
            </div>
          </div>

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
              {/* Create new list form */}
              {showCreateForm ? (
                <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name"
                    maxLength={100}
                    className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateList}
                      disabled={!newListName.trim()}
                      className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewListName("");
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
                  <span>+</span> Create New List
                </button>
              )}

              {/* List selection */}
              {groceryLists.length > 0 && (
                <>
                  <p className="mb-2 text-sm font-medium text-slate-300">
                    Or add to existing list:
                  </p>
                  {groceryLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selectedListId === list.id
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      {/* Radio button */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selectedListId === list.id
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-600"
                        }`}
                      >
                        {selectedListId === list.id && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* List info */}
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium text-white">
                          {list.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {list.itemCount} items
                          {list.checkedCount > 0 &&
                            ` • ${list.checkedCount} checked`}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={handleGenerate}
            disabled={isSaving}
            className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Adding..."
              : selectedListId
                ? "Add to Selected List"
                : "Create List & Add"}
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
