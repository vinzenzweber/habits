export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        {/* Header skeleton */}
        <header className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-800" />
        </header>

        {/* Streak card skeleton */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-slate-800" />
            <div className="space-y-2">
              <div className="h-6 w-24 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        </div>

        {/* Featured workout skeleton */}
        <section className="space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
                <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-36 animate-pulse rounded bg-slate-800" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-10 w-16 animate-pulse rounded-full bg-slate-800" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
              </div>
            </div>
          </div>
        </section>

        {/* Weekly schedule skeleton */}
        <section className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-slate-800" />
                  <div className="space-y-2">
                    <div className="h-5 w-24 animate-pulse rounded bg-slate-800" />
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                  </div>
                </div>
                <div className="h-4 w-12 animate-pulse rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
