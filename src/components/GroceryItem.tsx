"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GroceryListItem, GroceryListPermission } from "@/lib/grocery-types";
import { formatQuantity, formatRelativeTime } from "@/lib/grocery-utils";

interface GroceryItemProps {
  item: GroceryListItem;
  checkedByUserName?: string | null;
  permission: GroceryListPermission | "owner";
  onToggle: (itemId: number, checked: boolean) => Promise<void>;
  onDelete: (itemId: number) => Promise<void>;
}

/**
 * Individual grocery item row with checkbox, name, quantity, and delete action.
 * Supports optimistic UI updates for toggling.
 */
export function GroceryItem({
  item,
  checkedByUserName,
  permission,
  onToggle,
  onDelete,
}: GroceryItemProps) {
  const t = useTranslations("groceryItem");
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optimisticChecked, setOptimisticChecked] = useState(item.checked);

  const canEdit = permission === "owner" || permission === "edit";
  const quantityDisplay = formatQuantity(item.quantity, item.unit);

  const handleToggle = async () => {
    if (!canEdit || isToggling) return;

    const newChecked = !optimisticChecked;
    setOptimisticChecked(newChecked);
    setIsToggling(true);

    try {
      await onToggle(item.id, newChecked);
    } catch (error) {
      // Revert on error
      setOptimisticChecked(!newChecked);
      console.error("Failed to toggle item:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } catch (error) {
      console.error("Failed to delete item:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 transition ${
        optimisticChecked ? "bg-slate-800/30" : "hover:bg-slate-800/50"
      } ${isDeleting ? "opacity-50" : ""}`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={!canEdit || isToggling}
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
          optimisticChecked
            ? "border-emerald-500 bg-emerald-500 text-slate-950"
            : "border-slate-600 hover:border-slate-500"
        } ${!canEdit ? "cursor-not-allowed opacity-50" : ""}`}
        aria-label={optimisticChecked ? t("uncheckItem") : t("checkItem")}
      >
        {optimisticChecked && (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Item content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate ${
              optimisticChecked
                ? "text-slate-500 line-through"
                : "text-slate-100"
            }`}
          >
            {item.ingredientName}
          </span>
          {quantityDisplay && (
            <span className="flex-shrink-0 text-sm text-slate-500">
              ({quantityDisplay})
            </span>
          )}
        </div>

        {/* Checked by info */}
        {optimisticChecked && checkedByUserName && item.checkedAt && (
          <p className="text-xs text-slate-600">
            {checkedByUserName} • {formatRelativeTime(item.checkedAt)}
          </p>
        )}
      </div>

      {/* Delete button - visible on hover or focus */}
      {canEdit && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
          aria-label={t("deleteItem")}
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
