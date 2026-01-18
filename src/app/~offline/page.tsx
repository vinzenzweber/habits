"use client";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">📴</div>
        <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
        <p className="text-slate-400 max-w-sm">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-emerald-500 text-slate-950 font-semibold rounded-xl hover:bg-emerald-400 transition"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
