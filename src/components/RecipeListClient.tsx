"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";

import { RecipeSummary } from "@/lib/recipe-types";
import { SharedRecipeWithMe } from "@/lib/recipe-sharing-types";
import { RecipeSharingTranslations } from "@/lib/translations/recipe-sharing";
import { CollectionSummary, ReceivedCollection, Collection } from "@/lib/collection-types";
import {
  SortOption,
  filterAndSortRecipes,
  countActiveFilters,
} from "@/lib/recipe-filter-utils";
import { RecipeCard } from "./RecipeCard";
import { SharedRecipeCard } from "./SharedRecipeCard";
import { CollectionsDropdown } from "./CollectionsDropdown";
import { CreateCollectionModal } from "./CreateCollectionModal";
import type { PredefinedTag, TagCategory } from "@/lib/predefined-tags";

type TabType = "my" | "shared";

interface RecipeListClientProps {
  initialRecipes: RecipeSummary[];
  availableTags: string[];
  predefinedTags?: PredefinedTag[];
  sharedRecipes?: SharedRecipeWithMe[];
  sharingTranslations?: RecipeSharingTranslations;
  collections?: CollectionSummary[];
  receivedCollections?: ReceivedCollection[];
}

// ============================================
// Icons
// ============================================

const SearchIcon = () => (
  <svg
    className="h-4 w-4 text-slate-500"
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
);

const ClearIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const PlusIcon = () => (
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
);

// ============================================
// Component
// ============================================

// Category color mapping for tag chips
const CATEGORY_CHIP_COLORS: Record<TagCategory, { selected: string; unselected: string }> = {
  meal: {
    selected: "bg-blue-500 text-slate-950",
    unselected: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
  },
  diet: {
    selected: "bg-green-500 text-slate-950",
    unselected: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
  },
  cuisine: {
    selected: "bg-orange-500 text-slate-950",
    unselected: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30",
  },
  category: {
    selected: "bg-purple-500 text-slate-950",
    unselected: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",
  },
  effort: {
    selected: "bg-yellow-500 text-slate-950",
    unselected: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
  },
};

export function RecipeListClient({
  initialRecipes,
  availableTags,
  predefinedTags = [],
  sharedRecipes = [],
  sharingTranslations,
  collections: initialCollections = [],
  receivedCollections = [],
}: RecipeListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Collections state
  const [collections, setCollections] = useState<CollectionSummary[]>(initialCollections);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get("tab");
    return tab === "shared" ? "shared" : "my";
  });

  // Parse initial state from URL parameters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get("tags");
    return tags ? tags.split(",").filter(Boolean) : [];
  });
  const [favoritesOnly, setFavoritesOnly] = useState(
    searchParams.get("favorites") === "1"
  );
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = searchParams.get("sort");
    if (sort === "alpha" || sort === "rating") return sort;
    return "recent";
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state to URL parameters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    if (activeTab === "shared") {
      params.set("tab", "shared");
    }
    if (debouncedSearchQuery) {
      params.set("q", debouncedSearchQuery);
    }
    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","));
    }
    if (favoritesOnly) {
      params.set("favorites", "1");
    }
    if (sortBy !== "recent") {
      params.set("sort", sortBy);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [activeTab, debouncedSearchQuery, selectedTags, favoritesOnly, sortBy, pathname, router]);

  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  // Filter and sort recipes using extracted utilities
  const filteredRecipes = useMemo(
    () =>
      filterAndSortRecipes(initialRecipes, {
        searchQuery: debouncedSearchQuery,
        selectedTags,
        favoritesOnly,
        sortBy,
      }),
    [initialRecipes, debouncedSearchQuery, selectedTags, favoritesOnly, sortBy]
  );

  // Filter shared recipes by search query
  const filteredSharedRecipes = useMemo(() => {
    if (!debouncedSearchQuery) return sharedRecipes;
    const query = debouncedSearchQuery.toLowerCase();
    return sharedRecipes.filter(
      (sr) =>
        sr.recipe.title.toLowerCase().includes(query) ||
        sr.recipe.description?.toLowerCase().includes(query) ||
        sr.owner.name.toLowerCase().includes(query)
    );
  }, [sharedRecipes, debouncedSearchQuery]);

  // Toggle a tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedTags([]);
    setFavoritesOnly(false);
    setSortBy("recent");
  };

  // Handle collection creation
  const handleCollectionSaved = (newCollection: Collection) => {
    setCollections((prev) => [
      {
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        coverImageUrl: newCollection.coverImageUrl,
        recipeCount: 0,
        updatedAt: newCollection.updatedAt,
      },
      ...prev,
    ]);
    router.refresh();
  };

  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Clear filters when switching tabs
    clearFilters();
  };

  // Count active filters using extracted utility
  const activeFilterCount = countActiveFilters({
    searchQuery: debouncedSearchQuery,
    selectedTags,
    favoritesOnly,
    sortBy,
  });

  const hasFilters = activeFilterCount > 0;
  const hasNoResults = activeTab === "my"
    ? filteredRecipes.length === 0 && initialRecipes.length > 0
    : filteredSharedRecipes.length === 0 && sharedRecipes.length > 0;
  const hasNoRecipes = activeTab === "my"
    ? initialRecipes.length === 0
    : sharedRecipes.length === 0;

  // Show tabs only if there are shared recipes
  const showTabs = sharedRecipes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
          <button
            onClick={() => handleTabChange("my")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "my"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {sharingTranslations?.myRecipes ?? "My Recipes"}
            <span className="ml-1.5 text-xs opacity-70">({initialRecipes.length})</span>
          </button>
          <button
            onClick={() => handleTabChange("shared")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "shared"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {sharingTranslations?.sharedWithMe ?? "Shared with me"}
            <span className="ml-1.5 text-xs opacity-70">({sharedRecipes.length})</span>
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Tag chips and filter bar - only show for My Recipes tab */}
      {activeTab === "my" && (
        <>
          {/* Tag chips (only show if tags exist) */}
          {availableTags.length > 0 && (
            <div className="-mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
              <div className="flex gap-2 pb-1">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  // Find predefined tag for category color
                  const predefinedTag = predefinedTags.find(pt => pt.id === tag);
                  const category = predefinedTag?.category;

                  // Get color classes based on category
                  let colorClass: string;
                  if (isSelected) {
                    colorClass = category
                      ? `${CATEGORY_CHIP_COLORS[category].selected} font-medium`
                      : "bg-emerald-500 font-medium text-slate-950";
                  } else {
                    colorClass = category
                      ? CATEGORY_CHIP_COLORS[category].unselected
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700";
                  }

                  // Display label: use German label for predefined, tag ID for custom
                  const displayLabel = predefinedTag?.label || tag;

                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${colorClass}`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-3">
            {/* Collections dropdown */}
            <CollectionsDropdown
              collections={collections}
              receivedCollections={receivedCollections}
              onCreateCollection={() => setShowCreateCollectionModal(true)}
            />

            {/* Favorites toggle */}
            <button
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                favoritesOnly
                  ? "bg-emerald-500 font-medium text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>❤️</span>
              <span>Favorites</span>
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none rounded-xl border border-slate-700 bg-slate-800 py-2 pl-4 pr-10 text-sm text-slate-100 transition focus:border-emerald-500 focus:outline-none"
              >
                <option value="recent">Most recent</option>
                <option value="alpha">A-Z</option>
                <option value="rating">Highest rated</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDownIcon />
              </div>
            </div>

            {/* Active filter count */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                <span>{activeFilterCount} active</span>
                <ClearIcon />
              </button>
            )}
          </div>
        </>
      )}

      {/* Content area - My Recipes */}
      {activeTab === "my" && (
        <>
          {hasNoRecipes ? (
            /* Empty state - no recipes at all */
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <span className="text-5xl">🍳</span>
                <h2 className="text-xl font-semibold text-white">No recipes yet</h2>
                <p className="text-slate-400">
                  Start building your collection of healthy recipes. Import from the
                  web or create your own.
                </p>
                <Link
                  href="/recipes/new"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
                >
                  <PlusIcon />
                  Add your first recipe
                </Link>
              </div>
            </section>
          ) : hasNoResults ? (
            /* Empty state - filters returned no results */
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <span className="text-5xl">🔍</span>
                <h2 className="text-xl font-semibold text-white">
                  No recipes match your filters
                </h2>
                <p className="text-slate-400">
                  Try adjusting your search or clearing some filters to see more
                  recipes.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
                >
                  Clear filters
                </button>
              </div>
            </section>
          ) : (
            /* Recipe list */
            <section className="grid gap-3 lg:grid-cols-6 lg:gap-3">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.slug} recipe={recipe} />
              ))}
            </section>
          )}
        </>
      )}

      {/* Content area - Shared Recipes */}
      {activeTab === "shared" && (
        <>
          {hasNoRecipes ? (
            /* Empty state - no shared recipes */
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <span className="text-5xl">📬</span>
                <h2 className="text-xl font-semibold text-white">No shared recipes</h2>
                <p className="text-slate-400">
                  When someone shares a recipe with you, it will appear here.
                </p>
              </div>
            </section>
          ) : hasNoResults ? (
            /* Empty state - search returned no results */
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <span className="text-5xl">🔍</span>
                <h2 className="text-xl font-semibold text-white">
                  No recipes match your search
                </h2>
                <p className="text-slate-400">
                  Try a different search term.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
                >
                  Clear search
                </button>
              </div>
            </section>
          ) : (
            /* Shared recipe list */
            <section className="grid gap-3 lg:grid-cols-6 lg:gap-3">
              {filteredSharedRecipes.map((sharedRecipe) => (
                <SharedRecipeCard
                  key={sharedRecipe.shareId}
                  sharedRecipe={sharedRecipe}
                />
              ))}
            </section>
          )}
        </>
      )}

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
        onSave={handleCollectionSaved}
      />
    </div>
  );
}
