"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { SharedRecipeWithMe } from "@/lib/recipe-sharing-types";
import { SharedRecipeBadge } from "./SharedRecipeBadge";

interface SharedRecipeCardProps {
  sharedRecipe: SharedRecipeWithMe;
}

/**
 * Card component for displaying shared recipe summaries in a list view.
 * Shows image, title, description, owner badge, and permission level.
 */
export function SharedRecipeCard({ sharedRecipe }: SharedRecipeCardProps) {
  const [imageError, setImageError] = useState(false);
  const { recipe, owner, permission } = sharedRecipe;

  // Use shared route for viewing shared recipes
  const linkHref = `/recipes/shared/${recipe.slug}`;
  const hasImage = recipe.primaryImage?.url && !imageError;

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
  const showTimes = recipe.prepTimeMinutes !== undefined || recipe.cookTimeMinutes !== undefined;

  return (
    <Link
      href={linkHref}
      className="block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700"
      aria-label={`View shared recipe: ${recipe.title}`}
    >
      {/* Image section */}
      <div className="relative aspect-video w-full bg-slate-800">
        {hasImage ? (
          <Image
            src={recipe.primaryImage!.url}
            alt={recipe.title}
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
        {/* Owner badge overlay */}
        <div className="absolute bottom-2 left-2">
          <SharedRecipeBadge variant="from" ownerName={owner.name} />
        </div>
        {/* Permission badge */}
        <div className="absolute bottom-2 right-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
              permission === "edit"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-500/20 text-slate-400"
            }`}
          >
            {permission === "edit" ? "Can edit" : "View only"}
          </span>
        </div>
      </div>

      {/* Content section */}
      <div className="space-y-2 p-4 lg:space-y-1.5 lg:p-2.5">
        {/* Title */}
        <h3 className="truncate font-medium text-white">{recipe.title}</h3>

        {/* Description */}
        {recipe.description && (
          <p className="line-clamp-2 text-sm text-slate-400 lg:line-clamp-1 lg:text-xs">
            {recipe.description}
          </p>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 lg:gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400 lg:px-1.5"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400 lg:px-1.5">
                +{recipe.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Time and servings */}
        {(showTimes || recipe.servings) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 lg:gap-2">
            {showTimes && <span>🕐 {timeDisplay}</span>}
            {recipe.servings && <span>👥 {servingsDisplay}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
