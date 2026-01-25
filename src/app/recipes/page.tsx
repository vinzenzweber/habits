import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { getUserRecipeSummaries, getUserTags } from "@/lib/recipes";
import { getUserCollections, getReceivedCollections } from "@/lib/collection-db";
import { getSharedWithMe } from "@/lib/recipe-sharing";
import { RecipeListClient } from "@/components/RecipeListClient";
import { RecipePageHeader } from "@/components/RecipePageHeader";
import { PREDEFINED_TAGS } from "@/lib/predefined-tags";
import { getRecipeSharingTranslations } from "@/lib/translations/recipe-sharing";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const userLocale = session.user.locale ?? 'en-US';
  const sharingTranslations = getRecipeSharingTranslations(userLocale);

  // Parallel data fetching
  const [recipes, availableTags, collections, receivedCollections, sharedRecipes] = await Promise.all([
    getUserRecipeSummaries(),
    getUserTags(),
    getUserCollections(userId),
    getReceivedCollections(userId),
    getSharedWithMe(userId),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8 lg:max-w-6xl lg:px-12">
        {/* Header */}
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            FitStreak
          </p>
        </header>

        {/* Title section with Add and Camera buttons */}
        <RecipePageHeader />

        {/* Search, filter, and recipe list - wrapped in Suspense for useSearchParams */}
        <Suspense fallback={<RecipeListSkeleton />}>
          <RecipeListClient
            initialRecipes={recipes}
            availableTags={availableTags}
            predefinedTags={PREDEFINED_TAGS}
            sharedRecipes={sharedRecipes}
            sharingTranslations={sharingTranslations}
            collections={collections}
            receivedCollections={receivedCollections}
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
      <div className="grid gap-4 lg:grid-cols-6 lg:gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
          >
            <div className="aspect-video animate-pulse bg-slate-800" />
            <div className="space-y-2 p-4 lg:space-y-1.5 lg:p-2.5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
