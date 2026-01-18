"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { RecipeSummary } from "@/lib/recipe-types";
import { StarRating } from "./StarRating";
import { getTagById, getTagColorClass } from "@/lib/predefined-tags";

interface RecipeCardProps {
  recipe: RecipeSummary;
  href?: string; // Optional override for navigation (defaults to /recipes/[slug])
  showAddToCollection?: boolean; // Show add-to-collection button
  onAddToCollection?: () => void; // Callback when add button is clicked
}

/**
 * Card component for displaying recipe summaries in a list view.
 * Shows image, title, description, tags, time, and servings.
 */
export function RecipeCard({
  recipe,
  href,
  showAddToCollection,
  onAddToCollection,
}: RecipeCardProps) {
  const [imageError, setImageError] = useState(false);

  const linkHref = href ?? `/recipes/${recipe.slug}`;
  const hasImage = recipe.primaryImage?.url && !imageError;
  const showTimes =
    recipe.prepTimeMinutes !== undefined ||
    recipe.cookTimeMinutes !== undefined;

  // Format time display
  const timeDisplay = (() => {
    const parts: string[] = [];
    if (recipe.prepTimeMinutes) {
      parts.push(`${recipe.prepTimeMinutes}m prep`);
    }
    if (recipe.cookTimeMinutes) {
      parts.push(`${recipe.cookTimeMinutes}m cook`);
    }
    return parts.join(" • ");
  })();

  // Servings display with proper singular/plural
  const servingsDisplay = `${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}`;

  // Limit tags to 3
  const visibleTags = recipe.tags.slice(0, 3);
  const extraTagCount = recipe.tags.length - 3;

  return (
    <Link
      href={linkHref}
      className="block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700"
      aria-label={`View recipe: ${recipe.title}`}
    >
      {/* Image section */}
      <div className="relative aspect-video w-full bg-slate-800">
        {hasImage ? (
          <Image
            src={recipe.primaryImage!.url}
            alt={recipe.primaryImage!.caption ?? recipe.title}
            fill
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            🍳
          </div>
        )}

        {/* Add to collection button */}
        {showAddToCollection && onAddToCollection && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCollection();
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-300 backdrop-blur transition hover:bg-slate-800 hover:text-emerald-400"
            aria-label={`Add ${recipe.title} to collection`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Content section */}
      <div className="space-y-2 p-4">
        {/* Title */}
        <h3 className="truncate font-medium text-white">{recipe.title}</h3>

        {/* Description */}
        {recipe.description && (
          <p className="line-clamp-2 text-sm text-slate-400">
            {recipe.description}
          </p>
        )}

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => {
              // Get predefined tag info for display label and color
              const predefinedTag = getTagById(tag);
              const colorClass = getTagColorClass(tag);
              const displayLabel = predefinedTag?.label || tag;

              return (
                <span
                  key={tag}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colorClass}`}
                >
                  {displayLabel}
                </span>
              );
            })}
            {extraTagCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400">
                +{extraTagCount} more
              </span>
            )}
          </div>
        )}

        {/* Rating */}
        {recipe.averageRating !== undefined && recipe.averageRating > 0 && (
          <div className="flex items-center gap-1">
            <StarRating rating={recipe.averageRating} size="sm" />
            {recipe.ratingCount !== undefined && (
              <span className="text-xs text-slate-500">
                ({recipe.ratingCount})
              </span>
            )}
          </div>
        )}

        {/* Time and servings */}
        {(showTimes || recipe.servings) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {showTimes && <span>🕐 {timeDisplay}</span>}
            {recipe.servings && <span>👥 {servingsDisplay}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
