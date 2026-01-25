"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function RecipeDetailError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("recipeDetailError");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/recipes"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
          >
            {t("backToRecipes")}
          </Link>
        </header>

        {/* Error state */}
        <section className="rounded-2xl border border-red-800 bg-red-900/20 p-8 text-center">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
            <span className="text-5xl">⚠️</span>
            <h2 className="text-xl font-semibold text-white">
              {t("somethingWentWrong")}
            </h2>
            <p className="text-slate-400">
              {t("couldNotLoadRecipe")}
            </p>
            <div className="mt-2 flex gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                {t("tryAgain")}
              </button>
              <Link
                href="/recipes"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                {t("viewAllRecipes")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
