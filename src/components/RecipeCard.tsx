"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { RecipeSummary } from "@/lib/recipe-types";

interface RecipeCardProps {
  recipe: RecipeSummary;
  href?: string; // Optional override for navigation (defaults to /recipes/[slug])
}

/**
 * Card component for displaying recipe summaries in a list view.
 * Shows image, title, description, tags, time, and servings.
 */
export function RecipeCard({ recipe, href }: RecipeCardProps) {
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
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            🍳
          </div>
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
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400"
              >
                {tag}
              </span>
            ))}
            {extraTagCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400">
                +{extraTagCount} more
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
