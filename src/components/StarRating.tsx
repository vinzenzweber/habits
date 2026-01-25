"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface StarRatingProps {
  rating: number; // Current rating (0-5, can be fractional for display)
  maxStars?: number; // Default 5
  interactive?: boolean; // Allow clicking to set rating
  size?: "sm" | "md" | "lg";
  onRate?: (rating: number) => void;
  showCount?: number; // Optional count to display
}

const STAR_SIZES = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function StarRating({
  rating,
  maxStars = 5,
  interactive = false,
  size = "md",
  onRate,
  showCount,
}: StarRatingProps) {
  const t = useTranslations("starRating");
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;
  const sizeClass = STAR_SIZES[size];

  const handleClick = (starIndex: number) => {
    if (interactive && onRate) {
      onRate(starIndex);
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxStars }, (_, i) => {
          const starIndex = i + 1;
          const fillPercentage = Math.min(
            100,
            Math.max(0, (displayRating - i) * 100)
          );

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => interactive && setHoverRating(starIndex)}
              onMouseLeave={() => setHoverRating(0)}
              className={`relative ${interactive ? "cursor-pointer" : "cursor-default"}`}
              aria-label={t("rateStars", { count: starIndex })}
            >
              {/* Empty star (background) */}
              <svg
                className={`${sizeClass} text-slate-600`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {/* Filled star (overlay with clip) */}
              <svg
                className={`${sizeClass} absolute inset-0 text-amber-400`}
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
      </div>
      {showCount !== undefined && (
        <span className="ml-1 text-sm text-slate-400">({showCount})</span>
      )}
    </div>
  );
}
