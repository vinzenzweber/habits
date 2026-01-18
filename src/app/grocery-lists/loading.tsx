export default function GroceryListsLoading() {
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
          <div className="h-8 w-36 animate-pulse rounded bg-slate-800" />
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
        </div>

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
    </main>
  );
}
