"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CollectionSummary, ReceivedCollection, Collection } from "@/lib/collection-types";
import { CollectionsSection } from "./CollectionsSection";
import { CreateCollectionModal } from "./CreateCollectionModal";

interface CollectionsSectionWrapperProps {
  initialCollections: CollectionSummary[];
  initialReceivedCollections: ReceivedCollection[];
}

/**
 * Client wrapper for CollectionsSection that manages modal state.
 */
export function CollectionsSectionWrapper({
  initialCollections,
  initialReceivedCollections,
}: CollectionsSectionWrapperProps) {
  const router = useRouter();
  const [collections, setCollections] =
    useState<CollectionSummary[]>(initialCollections);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleCollectionSaved = (newCollection: Collection) => {
    // Add new collection to the list
    setCollections((prev) => [
      {
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        coverImageUrl: newCollection.coverImageUrl,
        recipeCount: 0,
        updatedAt: newCollection.updatedAt,
      },
      ...prev,
    ]);
    // Refresh to get updated data
    router.refresh();
  };

  return (
    <>
      <CollectionsSection
        collections={collections}
        receivedCollections={initialReceivedCollections}
        onCreateClick={handleCreateClick}
      />

      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCollectionSaved}
      />
    </>
  );
}
