"use client";

import { useState } from "react";

import { CollectionSummary, ReceivedCollection } from "@/lib/collection-types";
import { CollectionCard, CreateCollectionCard } from "./CollectionCard";

interface CollectionsSectionProps {
  collections: CollectionSummary[];
  receivedCollections: ReceivedCollection[];
  onCreateClick: () => void;
}

type Tab = "my" | "shared";

/**
 * Horizontal scrolling section displaying user's collections.
 * Shows toggle between "My Collections" and "Shared with me".
 */
export function CollectionsSection({
  collections,
  receivedCollections,
  onCreateClick,
}: CollectionsSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("my");

  const hasReceivedCollections = receivedCollections.length > 0;

  return (
    <section aria-label="Collections" className="space-y-3">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
          Collections
        </h2>

        {/* Tab toggle - only show if there are received collections */}
        {hasReceivedCollections && (
          <div className="flex gap-1 rounded-lg bg-slate-800 p-0.5">
            <button
              onClick={() => setActiveTab("my")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                activeTab === "my"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                activeTab === "shared"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Shared ({receivedCollections.length})
            </button>
          </div>
        )}
      </div>

      {/* Horizontal scroll container */}
      <div className="-mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
        <div className="flex gap-3 pb-2">
          {activeTab === "my" ? (
            <>
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
              <CreateCollectionCard onClick={onCreateClick} />
            </>
          ) : (
            <>
              {receivedCollections.length > 0 ? (
                receivedCollections.map((received) => (
                  <CollectionCard
                    key={received.collection.id}
                    collection={{
                      id: received.collection.id,
                      name: received.collection.name,
                      description: received.collection.description,
                      coverImageUrl: received.collection.coverImageUrl,
                      recipeCount: 0, // Will be fetched on detail page
                      updatedAt: received.collection.updatedAt,
                    }}
                    sharedBy={{ name: received.sharedBy.name }}
                  />
                ))
              ) : (
                <div className="flex h-32 w-full items-center justify-center text-sm text-slate-500">
                  No shared collections yet
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
