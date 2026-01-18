"use client";

import { useState } from "react";
import { RatingHistory } from "@/lib/recipe-types";
import { StarRating } from "./StarRating";

interface RatingHistorySectionProps {
  history: RatingHistory;
  currentVersion: number;
  translations: {
    ratingHistory: string;
    version: string;
    noRatings: string;
    ratings: string;
  };
}

export function RatingHistorySection({
  history,
  currentVersion,
  translations: t,
}: RatingHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) {
    return null;
  }

  return (
    <section
      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
      aria-label={t.ratingHistory}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-800/50 transition sm:px-6"
      >
        <h2 className="text-lg font-semibold text-white">{t.ratingHistory}</h2>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="divide-y divide-slate-800 border-t border-slate-800">
          {history.map((versionStats) => (
            <div key={versionStats.version} className="px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`text-sm font-medium ${
                    versionStats.version === currentVersion
                      ? "text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {t.version} {versionStats.version}
                  {versionStats.version === currentVersion && " (current)"}
                </span>
                <StarRating rating={versionStats.averageRating} size="sm" />
                <span className="text-xs text-slate-500">
                  ({versionStats.ratingCount} {t.ratings})
                </span>
              </div>

              {versionStats.ratings.length > 0 ? (
                <ul className="space-y-2">
                  {versionStats.ratings.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-slate-300">
                        {r.userName}
                      </span>
                      <StarRating rating={r.rating} size="sm" />
                      {r.comment && (
                        <span className="text-slate-400">— {r.comment}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">{t.noRatings}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
