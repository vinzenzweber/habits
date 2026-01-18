"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CollectionSummary } from "@/lib/collection-types";

interface CollectionCardProps {
  collection: CollectionSummary;
  sharedBy?: { name: string };
  href?: string;
}

/**
 * Card component for displaying collection summaries in a horizontal scroll view.
 * Shows cover image (or emoji fallback), name, recipe count, and optional "shared by" badge.
 */
export function CollectionCard({ collection, sharedBy, href }: CollectionCardProps) {
  const [imageError, setImageError] = useState(false);

  const linkHref = href ?? `/recipes/collections/${collection.id}`;
  const hasImage = collection.coverImageUrl && !imageError;

  return (
    <Link
      href={linkHref}
      className="flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700"
      aria-label={`View collection: ${collection.name}`}
    >
      {/* Cover image */}
      <div className="relative aspect-square w-full bg-slate-800">
        {hasImage ? (
          <Image
            src={collection.coverImageUrl!}
            alt={collection.name}
            fill
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            📁
          </div>
        )}

        {/* Shared by badge */}
        {sharedBy && (
          <div className="absolute bottom-1 left-1 right-1">
            <span className="inline-block truncate rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-300">
              From {sharedBy.name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 p-2">
        <h3 className="truncate text-sm font-medium text-white">
          {collection.name}
        </h3>
        <p className="text-xs text-slate-400">
          {collection.recipeCount} {collection.recipeCount === 1 ? "recipe" : "recipes"}
        </p>
      </div>
    </Link>
  );
}

/**
 * Special card for creating a new collection
 */
export function CreateCollectionCard({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-32 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-700 bg-transparent transition-colors hover:border-slate-600"
      style={{ aspectRatio: "1/1.35" }}
      aria-label="Create new collection"
    >
      <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xl text-slate-400">
          +
        </span>
        <span className="text-xs text-slate-400">New Collection</span>
      </div>
    </button>
  );
}
