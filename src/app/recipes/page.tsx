import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getUserRecipeSummaries } from "@/lib/recipes";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

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

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const recipes = await getUserRecipeSummaries();

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

        {/* Title section with Add button */}
        <section className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Recipes
          </h1>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            <PlusIcon />
            Add Recipe
          </Link>
        </section>

        {/* Content area */}
        {recipes.length === 0 ? (
          /* Empty state */
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
              <span className="text-5xl">🍳</span>
              <h2 className="text-xl font-semibold text-white">
                No recipes yet
              </h2>
              <p className="text-slate-400">
                Start building your collection of healthy recipes. Import from
                the web or create your own.
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
        ) : (
          /* Recipe list placeholder - will be implemented in future issue */
          <section className="grid gap-3">
            {recipes.map((recipe) => (
              <div
                key={recipe.slug}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <h3 className="font-medium text-white">{recipe.title}</h3>
                {recipe.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
