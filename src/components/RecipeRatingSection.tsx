"use client";

import { useState, useCallback } from "react";
import { StarRating } from "./StarRating";

interface RecipeRatingSectionProps {
  recipeSlug: string;
  recipeVersion: number;
  initialUserRating?: number;
  initialAverageRating: number;
  initialRatingCount: number;
  translations: {
    yourRating: string;
    averageRating: string;
    ratings: string;
    addComment: string;
    submitRating: string;
    ratingSubmitted: string;
    ratingSectionLabel: string;
  };
}

export function RecipeRatingSection({
  recipeSlug,
  recipeVersion,
  initialUserRating,
  initialAverageRating,
  initialRatingCount,
  translations: t,
}: RecipeRatingSectionProps) {
  const [userRating, setUserRating] = useState(initialUserRating ?? 0);
  const [averageRating, setAverageRating] = useState(initialAverageRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = useCallback((rating: number) => {
    setUserRating(rating);
    setShowComment(true);
    setSubmitted(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (userRating === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/recipes/${recipeSlug}/versions/${recipeVersion}/rating`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: userRating,
            comment: comment || undefined,
          }),
        }
      );

      if (response.ok) {
        setSubmitted(true);
        setShowComment(false);
        // Refresh stats
        const statsResponse = await fetch(
          `/api/recipes/${recipeSlug}/versions/${recipeVersion}/rating`
        );
        if (statsResponse.ok) {
          const { versionStats } = await statsResponse.json();
          setAverageRating(versionStats.averageRating);
          setRatingCount(versionStats.ratingCount);
        }
      }
    } catch (error) {
      console.error("Failed to submit rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [recipeSlug, recipeVersion, userRating, comment]);

  return (
    <section
      className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur sm:p-6"
      aria-label={t.ratingSectionLabel}
    >
      <div className="flex flex-wrap items-center gap-6">
        {/* Average rating display */}
        <div className="flex items-center gap-2">
          <StarRating rating={averageRating} size="md" />
          <span className="text-sm text-slate-400">
            {averageRating.toFixed(1)} ({ratingCount} {t.ratings})
          </span>
        </div>

        {/* User rating input */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{t.yourRating}:</span>
          <StarRating
            rating={userRating}
            interactive
            size="md"
            onRate={handleRate}
          />
        </div>
      </div>

      {/* Comment input (shown after selecting rating) */}
      {showComment && (
        <div className="mt-4 flex flex-col gap-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.addComment}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="self-start rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {isSubmitting ? "..." : t.submitRating}
          </button>
        </div>
      )}

      {submitted && (
        <p className="mt-3 text-sm text-emerald-400">{t.ratingSubmitted}</p>
      )}
    </section>
  );
}
