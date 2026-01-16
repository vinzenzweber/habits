"use client";

export default function RecipesError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            FitStreak
          </p>
        </header>

        {/* Error state */}
        <section className="rounded-2xl border border-red-800 bg-red-900/20 p-8 text-center">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
            <span className="text-5xl">⚠️</span>
            <h2 className="text-xl font-semibold text-white">
              Something went wrong
            </h2>
            <p className="text-slate-400">
              We couldn&apos;t load your recipes. Please try again.
            </p>
            <button
              onClick={reset}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              Try again
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
