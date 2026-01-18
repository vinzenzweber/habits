"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GROCERY_CATEGORIES, GroceryCategory } from "@/lib/grocery-types";
import { CATEGORY_CONFIG } from "@/lib/grocery-utils";

interface AddItemModalProps {
  isOpen: boolean;
  listId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CloseIcon = () => (
  <svg
    className="h-5 w-5"
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
);

export function AddItemModal({
  isOpen,
  listId,
  onClose,
  onSuccess,
}: AddItemModalProps) {
  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<GroceryCategory | "">("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIngredientName("");
      setQuantity("");
      setUnit("");
      setCategory("");
      setIsAdding(false);
      setError(null);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleAdd = useCallback(async () => {
    if (!ingredientName.trim()) {
      setError("Please enter an item name");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        ingredientName: ingredientName.trim(),
      };

      if (quantity) {
        const parsedQuantity = parseFloat(quantity);
        if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
          body.quantity = parsedQuantity;
        }
      }

      if (unit.trim()) {
        body.unit = unit.trim();
      }

      if (category) {
        body.category = category;
      }

      const res = await fetch(`/api/grocery-lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add item");
        return;
      }

      // Clear fields for next item but keep modal open for quick-add
      setIngredientName("");
      setQuantity("");
      setUnit("");
      // Keep category for similar items
      onSuccess();

      // Focus back on input for quick adding
      inputRef.current?.focus();
    } catch (err) {
      console.error("Error adding item:", err);
      setError("Failed to add item");
    } finally {
      setIsAdding(false);
    }
  }, [ingredientName, quantity, unit, category, listId, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isAdding) {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd, isAdding]
  );

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
        className="fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[450px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold">Add Item</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Item name input */}
            <div>
              <label
                htmlFor="item-name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Item Name *
              </label>
              <input
                ref={inputRef}
                id="item-name"
                type="text"
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Tomatoes"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
                disabled={isAdding}
              />
            </div>

            {/* Quantity and unit - side by side */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label
                  htmlFor="item-quantity"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Quantity
                </label>
                <input
                  id="item-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 2"
                  min="0"
                  step="any"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
                  disabled={isAdding}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="item-unit"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Unit
                </label>
                <input
                  id="item-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., lbs, kg, pieces"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
                  disabled={isAdding}
                />
              </div>
            </div>

            {/* Category dropdown */}
            <div>
              <label
                htmlFor="item-category"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Category
              </label>
              <select
                id="item-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as GroceryCategory | "")
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 transition focus:border-emerald-500 focus:outline-none"
                disabled={isAdding}
              >
                <option value="">No category</option>
                {GROCERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleAdd}
                disabled={isAdding || !ingredientName.trim()}
                className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add Item"}
              </button>
              <button
                onClick={onClose}
                disabled={isAdding}
                className="py-2 text-slate-400 transition hover:text-white disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
