"use client";

import Link from "next/link";
import { GroceryListSummary } from "@/lib/grocery-types";
import { formatRelativeTime } from "@/lib/grocery-utils";

interface GroceryListCardProps {
  list: GroceryListSummary;
}

/**
 * Card component for displaying grocery list summaries in a list view.
 * Shows name, item count, checked count, owner (if shared), and last updated time.
 */
export function GroceryListCard({ list }: GroceryListCardProps) {
  const progressPercent =
    list.itemCount > 0
      ? Math.round((list.checkedCount / list.itemCount) * 100)
      : 0;

  return (
    <Link
      href={`/grocery-lists/${list.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
      aria-label={`View list: ${list.name}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl">
          {list.itemCount === list.checkedCount && list.itemCount > 0 ? (
            <span className="text-emerald-400">&#10003;</span>
          ) : (
            "🛒"
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title and shared indicator */}
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-white">{list.name}</h3>
            {!list.isOwner && (
              <span className="flex-shrink-0 text-xs text-slate-500">
                (shared)
              </span>
            )}
          </div>

          {/* Progress and meta info */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            <span>
              {list.checkedCount}/{list.itemCount} items
            </span>
            <span className="text-slate-600">•</span>
            <span>{formatRelativeTime(list.updatedAt)}</span>
          </div>

          {/* Progress bar */}
          {list.itemCount > 0 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercent === 100
                    ? "bg-emerald-500"
                    : "bg-emerald-500/70"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Owner info for shared lists */}
          {!list.isOwner && (
            <p className="mt-2 text-xs text-slate-500">
              Owner: {list.ownerName}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
