export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header skeleton */}
        <header className="mb-6">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-48 mt-2 animate-pulse rounded bg-slate-800" />
        </header>

        {/* Form sections skeleton */}
        <div className="space-y-6">
          {/* Profile section */}
          <div className="space-y-4">
            <div className="h-5 w-20 animate-pulse rounded bg-slate-800" />
            <div className="space-y-3">
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
            </div>
          </div>

          {/* Preferences section */}
          <div className="space-y-4">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
            <div className="space-y-3">
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
            </div>
          </div>

          {/* Recipe settings section */}
          <div className="space-y-4">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
            <div className="space-y-3">
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
            </div>
          </div>

          {/* Save button skeleton */}
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
