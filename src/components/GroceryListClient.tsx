"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GroceryListSummary } from "@/lib/grocery-types";
import { GroceryListCard } from "./GroceryListCard";
import { CreateListModal } from "./CreateListModal";

interface GroceryListClientProps {
  initialLists: GroceryListSummary[];
}

type FilterTab = "all" | "my" | "shared";

/**
 * Client component for the grocery lists page.
 * Handles filtering, search, and list creation.
 */
export function GroceryListClient({ initialLists }: GroceryListClientProps) {
  const router = useRouter();
  const t = useTranslations("groceryLists");
  const [lists, setLists] = useState(initialLists);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter and search lists
  const filteredLists = useMemo(() => {
    let result = lists;

    // Apply filter
    if (filter === "my") {
      result = result.filter((list) => list.isOwner);
    } else if (filter === "shared") {
      result = result.filter((list) => !list.isOwner);
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((list) =>
        list.name.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [lists, filter, search]);

  // Count for tabs
  const myListsCount = lists.filter((list) => list.isOwner).length;
  const sharedListsCount = lists.filter((list) => !list.isOwner).length;

  const handleCreateSuccess = (id: number, name: string) => {
    // Add the new list to the state (optimistic update)
    const newList: GroceryListSummary = {
      id,
      name,
      ownerUserId: 0, // Will be corrected on refresh
      ownerName: "",
      itemCount: 0,
      checkedCount: 0,
      isOwner: true,
      permission: "owner",
      updatedAt: new Date(),
    };
    setLists([newList, ...lists]);

    // Navigate to the new list
    router.push(`/grocery-lists/${id}`);
  };

  return (
    <>
      {/* Search and filter */}
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchLists")}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "all"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t("all")} ({lists.length})
          </button>
          <button
            onClick={() => setFilter("my")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "my"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t("myLists")} ({myListsCount})
          </button>
          {sharedListsCount > 0 && (
            <button
              onClick={() => setFilter("shared")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === "shared"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("shared")} ({sharedListsCount})
            </button>
          )}
        </div>
      </div>

      {/* List of grocery lists */}
      {filteredLists.length > 0 ? (
        <div className="space-y-3">
          {filteredLists.map((list) => (
            <GroceryListCard key={list.id} list={list} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-12 text-center">
          <div className="mb-4 text-5xl">🛒</div>
          {search ? (
            <>
              <p className="text-lg font-medium text-white">{t("noListsFound")}</p>
              <p className="mt-1 text-sm text-slate-400">
                {t("tryDifferentSearch")}
              </p>
            </>
          ) : filter !== "all" ? (
            <>
              <p className="text-lg font-medium text-white">
                {filter === "my" ? t("noPersonalLists") : t("noSharedLists")}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {filter === "my"
                  ? t("createToStart")
                  : t("sharedListsAppearHere")}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-white">{t("noGroceryListsYet")}</p>
              <p className="mt-1 text-sm text-slate-400">
                {t("createFirstList")}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 rounded-xl bg-emerald-500 px-6 py-2 font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                {t("createList")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Create list modal */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
