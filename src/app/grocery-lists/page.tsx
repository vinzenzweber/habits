import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { getUserGroceryLists } from "@/lib/grocery-db";
import { LogoutButton } from "@/components/LogoutButton";
import { GroceryListClient } from "@/components/GroceryListClient";
import { GroceryListPageHeader } from "@/components/GroceryListPageHeader";

export const dynamic = "force-dynamic";

export default async function GroceryListsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const lists = await getUserGroceryLists(userId);

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

        {/* Title section with Create button */}
        <GroceryListPageHeader />

        {/* Search, filter, and list - wrapped in Suspense for client-side state */}
        <Suspense fallback={<GroceryListSkeleton />}>
          <GroceryListClient initialLists={lists} />
        </Suspense>
      </div>
    </main>
  );
}

function GroceryListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Search input skeleton */}
      <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
      {/* Filter tabs skeleton */}
      <div className="flex gap-3">
        <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-800" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800" />
      </div>
      {/* List cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
