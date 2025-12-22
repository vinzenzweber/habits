"use client";

import { useState } from "react";
import { useCanInstallPWA, useIsPWA } from "@/lib/pwa";

export function InstallPrompt() {
  const isPWA = useIsPWA();
  const { canInstall, promptInstall } = useCanInstallPWA();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if already installed or dismissed or can't install
  if (isPWA || isDismissed || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    await promptInstall();
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 rounded-full bg-emerald-500/20 p-3">
          <svg
            className="h-6 w-6 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">
            Install Habits App
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Install this app on your home screen for the best experience.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-slate-700 px-6 py-2 text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
