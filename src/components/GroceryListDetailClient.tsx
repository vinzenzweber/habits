"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  GroceryListWithItems,
  GroceryListItem,
} from "@/lib/grocery-types";
import {
  groupItemsByCategory,
  getCategoryLabel,
  getCategoryIcon,
} from "@/lib/grocery-utils";
import { GroceryItem } from "./GroceryItem";
import { AddItemModal } from "./AddItemModal";
import { ShareGroceryListModal } from "./ShareGroceryListModal";

interface GroceryListDetailClientProps {
  initialList: GroceryListWithItems;
  checkedByNames: Record<number, string | null>;
}

/**
 * Client component for the grocery list detail page.
 * Handles item interactions, real-time sync, and modals.
 */
export function GroceryListDetailClient({
  initialList,
  checkedByNames,
}: GroceryListDetailClientProps) {
  const router = useRouter();
  const t = useTranslations("groceryLists");
  const tModal = useTranslations("groceryModal");
  const tCommon = useTranslations("common");
  const tSharing = useTranslations("sharing");
  const tErrors = useTranslations("errors");
  const [list, setList] = useState(initialList);
  const [userNames, setUserNames] = useState(checkedByNames);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastUpdated = useRef(initialList.updatedAt);

  const canEdit = list.permission === "owner" || list.permission === "edit";
  const isOwner = list.permission === "owner";

  // Calculate progress
  const totalItems = list.items.length;
  const checkedItems = list.items.filter((item) => item.checked).length;
  const progressPercent =
    totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Group items by category
  const groupedItems = groupItemsByCategory(list.items);

  // Real-time sync polling
  useEffect(() => {
    const pollInterval = 5000; // 5 seconds

    const pollForUpdates = async () => {
      // Only poll when page is visible
      if (document.hidden) return;

      try {
        const res = await fetch(
          `/api/grocery-lists/${list.id}/sync?since=${lastUpdated.current.toISOString()}`
        );
        const data = await res.json();

        if (data.updated && data.list) {
          setList(data.list);
          lastUpdated.current = new Date(data.updatedAt);

          // Update user names for newly checked items
          const newNames = { ...userNames };
          for (const item of data.list.items as GroceryListItem[]) {
            if (item.checked && item.checkedByUserId) {
              // We might need to look up the user name
              // For now, we'll keep the existing names
            }
          }
          setUserNames(newNames);
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    };

    const interval = setInterval(pollForUpdates, pollInterval);

    // Also poll when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        pollForUpdates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [list.id, userNames]);

  const handleToggleItem = useCallback(
    async (itemId: number, checked: boolean) => {
      const res = await fetch(`/api/grocery-lists/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });

      if (!res.ok) {
        throw new Error(tErrors("failedToToggleItem"));
      }

      const data = await res.json();

      // Update local state
      setList((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? data.item : item
        ),
        updatedAt: new Date(),
      }));
      lastUpdated.current = new Date();
    },
    []
  );

  const handleDeleteItem = useCallback(async (itemId: number) => {
    const res = await fetch(`/api/grocery-lists/items/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error(tErrors("failedToDeleteItem"));
    }

    // Update local state
    setList((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
      updatedAt: new Date(),
    }));
    lastUpdated.current = new Date();
  }, []);

  const handleClearChecked = useCallback(async () => {
    if (!canEdit) return;

    try {
      const res = await fetch(`/api/grocery-lists/${list.id}/checked`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(tErrors("failedToClearCheckedItems"));
      }

      // Update local state
      setList((prev) => ({
        ...prev,
        items: prev.items.filter((item) => !item.checked),
        updatedAt: new Date(),
      }));
      lastUpdated.current = new Date();
    } catch (error) {
      console.error("Error clearing checked items:", error);
    }
  }, [list.id, canEdit]);

  const handleDeleteList = useCallback(async () => {
    if (!isOwner) return;

    if (!confirm(tModal("confirmDeleteList"))) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/grocery-lists/${list.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(tErrors("failedToDeleteList"));
      }

      router.push("/grocery-lists");
    } catch (error) {
      console.error("Error deleting list:", error);
      setIsDeleting(false);
    }
  }, [list.id, isOwner, router, tModal]);

  const handleItemAdded = useCallback(() => {
    // Refresh the list to get the new item
    fetch(`/api/grocery-lists/${list.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.list) {
          setList(data.list);
          lastUpdated.current = new Date(data.list.updatedAt);
        }
      })
      .catch(console.error);
  }, [list.id]);

  const handleSharesChange = useCallback(() => {
    // Refresh the list to get updated shares
    fetch(`/api/grocery-lists/${list.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.list) {
          setList(data.list);
        }
      })
      .catch(console.error);
  }, [list.id]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 pb-24 pt-8 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/grocery-lists"
            className="flex items-center gap-2 text-slate-400 transition hover:text-white"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{tCommon("back")}</span>
          </Link>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label={tCommon("menu")}
            >
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
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg">
                  {isOwner && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsShareModalOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-700"
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
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      {t("shareList")}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleDeleteList();
                      }}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-400 transition hover:bg-slate-700"
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
                      {isDeleting ? tCommon("loading") : tModal("deleteList")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Title and meta */}
        <div>
          <h1 className="text-2xl font-bold">{list.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            {!list.isOwner && <span>{tSharing("sharedByLabel")} {list.ownerName}</span>}
            {list.shares.length > 0 && (
              <span>{tSharing("sharedWith")} {list.shares.length}</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">{t("progress")}</span>
              <span className="font-medium">
                {checkedItems}/{totalItems} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercent === 100 ? "bg-emerald-500" : "bg-emerald-500/70"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Items grouped by category */}
        {totalItems > 0 ? (
          <div className="space-y-6">
            {Array.from(groupedItems.entries()).map(([category, items]) => (
              <div key={category}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
                  <span>{getCategoryIcon(category)}</span>
                  <span>{getCategoryLabel(category)}</span>
                  <span className="text-slate-600">({items.length})</span>
                </h2>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50">
                  {items.map((item) => (
                    <GroceryItem
                      key={item.id}
                      item={item}
                      checkedByUserName={userNames[item.id]}
                      permission={list.permission}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-12 text-center">
            <div className="mb-4 text-5xl">🛒</div>
            <p className="text-lg font-medium text-white">{t("emptyList")}</p>
            <p className="mt-1 text-sm text-slate-400">
              {t("addItemsToStart")}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {canEdit && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("addItem")}
            </button>
          )}

          {canEdit && checkedItems > 0 && (
            <button
              onClick={handleClearChecked}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-slate-300 transition hover:bg-slate-800"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {t("clearChecked")} ({checkedItems})
            </button>
          )}

          <Link
            href={`/grocery-lists/${list.id}/shop`}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-slate-300 transition hover:bg-slate-800"
          >
            <span>🛒</span>
            {t("shoppingMode")}
          </Link>
        </div>
      </div>

      {/* Modals */}
      <AddItemModal
        isOpen={isAddModalOpen}
        listId={list.id}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleItemAdded}
      />

      <ShareGroceryListModal
        isOpen={isShareModalOpen}
        listId={list.id}
        listName={list.name}
        initialShares={list.shares}
        onClose={() => setIsShareModalOpen(false)}
        onSharesChange={handleSharesChange}
      />
    </div>
  );
}
