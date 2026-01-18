import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { getUserRecipeSummaries, getUserTags } from "@/lib/recipes";
import { LogoutButton } from "@/components/LogoutButton";
import { RecipeListClient } from "@/components/RecipeListClient";
import { RecipePageHeader } from "@/components/RecipePageHeader";
import { PREDEFINED_TAGS } from "@/lib/predefined-tags";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Parallel data fetching
  const [recipes, availableTags] = await Promise.all([
    getUserRecipeSummaries(),
    getUserTags(),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            FitStreak
          </p>
          <LogoutButton />
        </header>

        {/* Title section with Add and Camera buttons */}
        <RecipePageHeader />

        {/* Search, filter, and recipe list - wrapped in Suspense for useSearchParams */}
        <Suspense fallback={<RecipeListSkeleton />}>
          <RecipeListClient
            initialRecipes={recipes}
            availableTags={availableTags}
            predefinedTags={PREDEFINED_TAGS}
          />
        </Suspense>
      </div>
    </main>
  );
}

function RecipeListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Search input skeleton */}
      <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-800" />
        <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-800" />
      </div>
      {/* Recipe cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
        >
          <div className="aspect-video animate-pulse bg-slate-800" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
