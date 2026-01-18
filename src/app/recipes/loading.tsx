export default function RecipesLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        {/* Header skeleton */}
        <header className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-800" />
        </header>

        {/* Title section skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-28 animate-pulse rounded bg-slate-800" />
          <div className="flex gap-2">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
          </div>
        </div>

        {/* Collections skeleton */}
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 w-32 shrink-0 animate-pulse rounded-xl bg-slate-800"
            />
          ))}
        </div>

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
    </main>
  );
}
