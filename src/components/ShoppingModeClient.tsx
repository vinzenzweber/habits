"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  GroceryListWithItems,
  GroceryListItem,
} from "@/lib/grocery-types";
import {
  groupItemsByCategory,
  getCategoryLabel,
  getCategoryIcon,
  formatQuantity,
} from "@/lib/grocery-utils";

interface ShoppingModeClientProps {
  initialList: GroceryListWithItems;
}

/**
 * Full-screen shopping mode for checking off items while shopping.
 * Features:
 * - Large touch targets for easy interaction
 * - Wake Lock API to keep screen awake
 * - Real-time sync with other users
 * - Simplified UI without header/footer chrome
 */
export function ShoppingModeClient({ initialList }: ShoppingModeClientProps) {
  const router = useRouter();
  const t = useTranslations("groceryLists");
  const tCommon = useTranslations("common");
  const [list, setList] = useState(initialList);
  const [isTogglingItem, setIsTogglingItem] = useState<number | null>(null);
  const lastUpdated = useRef(initialList.updatedAt);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const canEdit = list.permission === "owner" || list.permission === "edit";

  // Calculate progress
  const totalItems = list.items.length;
  const checkedItems = list.items.filter((item) => item.checked).length;
  const progressPercent =
    totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Group items by category
  const groupedItems = groupItemsByCategory(list.items);

  // Request wake lock to keep screen awake
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    };

    requestWakeLock();

    // Re-request wake lock when page becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Real-time sync polling
  useEffect(() => {
    const pollInterval = 5000; // 5 seconds

    const pollForUpdates = async () => {
      if (document.hidden) return;

      try {
        const res = await fetch(
          `/api/grocery-lists/${list.id}/sync?since=${lastUpdated.current.toISOString()}`
        );
        const data = await res.json();

        if (data.updated && data.list) {
          setList(data.list);
          lastUpdated.current = new Date(data.updatedAt);
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    };

    const interval = setInterval(pollForUpdates, pollInterval);

    return () => clearInterval(interval);
  }, [list.id]);

  const handleToggleItem = useCallback(
    async (itemId: number) => {
      if (!canEdit || isTogglingItem === itemId) return;

      const item = list.items.find((i) => i.id === itemId);
      if (!item) return;

      const newChecked = !item.checked;

      // Optimistic update
      setList((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, checked: newChecked } : i
        ),
      }));

      setIsTogglingItem(itemId);

      try {
        const res = await fetch(`/api/grocery-lists/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checked: newChecked }),
        });

        if (!res.ok) {
          // Revert on error
          setList((prev) => ({
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, checked: !newChecked } : i
            ),
          }));
          return;
        }

        const data = await res.json();
        setList((prev) => ({
          ...prev,
          items: prev.items.map((i) => (i.id === itemId ? data.item : i)),
          updatedAt: new Date(),
        }));
        lastUpdated.current = new Date();
      } catch (error) {
        console.error("Error toggling item:", error);
        // Revert on error
        setList((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, checked: !newChecked } : i
          ),
        }));
      } finally {
        setIsTogglingItem(null);
      }
    },
    [canEdit, isTogglingItem, list.items]
  );

  const handleExit = useCallback(() => {
    router.push(`/grocery-lists/${list.id}`);
  }, [router, list.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <button
          onClick={handleExit}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label={t("exitShopping")}
        >
          <svg
            className="h-6 w-6"
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

        <div className="text-center">
          <h1 className="text-lg font-semibold">{list.name}</h1>
          <p className="text-sm text-slate-400">
            {checkedItems}/{totalItems} items
          </p>
        </div>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Progress bar */}
      <div className="border-b border-slate-800 px-4 py-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              progressPercent === 100 ? "bg-emerald-500" : "bg-emerald-500/70"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {totalItems > 0 ? (
          <div className="space-y-4 p-4">
            {Array.from(groupedItems.entries()).map(([category, items]) => (
              <div key={category}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
                  <span>{getCategoryIcon(category)}</span>
                  <span>{getCategoryLabel(category)}</span>
                </h2>
                <div className="space-y-2">
                  {items.map((item) => (
                    <ShoppingItem
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      isToggling={isTogglingItem === item.id}
                      onToggle={handleToggleItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 text-6xl">🛒</div>
            <p className="text-lg font-medium text-white">{t("emptyList")}</p>
            <p className="mt-1 text-sm text-slate-400">
              {t("addItemsToStart")}
            </p>
          </div>
        )}
      </div>

      {/* Completion message */}
      {progressPercent === 100 && totalItems > 0 && (
        <div className="border-t border-slate-800 bg-emerald-500/10 p-4 text-center">
          <div className="text-2xl">🎉</div>
          <p className="mt-1 font-medium text-emerald-400">{t("allDone")}</p>
          <button
            onClick={handleExit}
            className="mt-3 rounded-xl bg-emerald-500 px-6 py-2 font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            {tCommon("done")}
          </button>
        </div>
      )}
    </div>
  );
}

interface ShoppingItemProps {
  item: GroceryListItem;
  canEdit: boolean;
  isToggling: boolean;
  onToggle: (itemId: number) => void;
}

function ShoppingItem({
  item,
  canEdit,
  isToggling,
  onToggle,
}: ShoppingItemProps) {
  const quantityDisplay = formatQuantity(item.quantity, item.unit);

  return (
    <button
      onClick={() => onToggle(item.id)}
      disabled={!canEdit || isToggling}
      className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition ${
        item.checked
          ? "bg-slate-800/30"
          : "bg-slate-900/50 hover:bg-slate-800/50"
      } ${!canEdit ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {/* Large checkbox */}
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 transition ${
          item.checked
            ? "border-emerald-500 bg-emerald-500 text-slate-950"
            : "border-slate-600"
        }`}
      >
        {item.checked && (
          <svg
            className="h-8 w-8"
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
      </div>

      {/* Item content */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-lg ${
            item.checked ? "text-slate-500 line-through" : "text-white"
          }`}
        >
          {item.ingredientName}
        </p>
        {quantityDisplay && (
          <p className="text-sm text-slate-500">{quantityDisplay}</p>
        )}
      </div>
    </button>
  );
}
