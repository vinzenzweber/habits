"use client";

import { useTranslations } from "next-intl";

export default function OfflinePage() {
  const t = useTranslations("errors");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">📴</div>
        <h1 className="text-2xl font-bold">{t("youreOffline")}</h1>
        <p className="text-slate-400 max-w-sm">
          {t("checkConnection")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-emerald-500 text-slate-950 font-semibold rounded-xl hover:bg-emerald-400 transition"
        >
          {t("tryAgain")}
        </button>
      </div>
    </main>
  );
}
