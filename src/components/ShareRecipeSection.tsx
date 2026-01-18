'use client';

import { useState, useCallback, useEffect } from 'react';
import { ShareRecipeModal } from './ShareRecipeModal';
import { ManageSharesModal } from './ManageSharesModal';
import { RecipeSharingTranslations } from '@/lib/translations/recipe-sharing';

interface ShareRecipeSectionProps {
  recipeSlug: string;
  translations: RecipeSharingTranslations;
}

const ShareIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

/**
 * Section component for recipe detail page showing share controls
 * Only visible to recipe owner
 */
export function ShareRecipeSection({
  recipeSlug,
  translations: t,
}: ShareRecipeSectionProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch share count on mount
  useEffect(() => {
    const fetchShareCount = async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeSlug}/share`);
        const data = await res.json();
        if (res.ok) {
          setShareCount(data.shares?.length ?? 0);
        }
      } catch (err) {
        console.error('Error fetching share count:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShareCount();
  }, [recipeSlug]);

  const handleShareSuccess = useCallback(() => {
    setShareCount((prev) => prev + 1);
  }, []);

  const handleOpenShare = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setIsShareModalOpen(false);
  }, []);

  const handleOpenManage = useCallback(() => {
    setIsManageModalOpen(true);
  }, []);

  const handleCloseManage = useCallback(() => {
    setIsManageModalOpen(false);
    // Refresh share count after managing
    fetch(`/api/recipes/${recipeSlug}/share`)
      .then((res) => res.json())
      .then((data) => {
        if (data.shares) {
          setShareCount(data.shares.length);
        }
      })
      .catch(() => {});
  }, [recipeSlug]);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Share button */}
        <button
          onClick={handleOpenShare}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition"
        >
          <ShareIcon />
          {t.shareButton}
        </button>

        {/* Manage shares button - only show if there are shares */}
        {!isLoading && shareCount > 0 && (
          <button
            onClick={handleOpenManage}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <UsersIcon />
            <span>{shareCount}</span>
          </button>
        )}
      </div>

      {/* Share Modal */}
      <ShareRecipeModal
        isOpen={isShareModalOpen}
        onClose={handleCloseShare}
        recipeSlug={recipeSlug}
        translations={t}
        onShareSuccess={handleShareSuccess}
      />

      {/* Manage Shares Modal */}
      <ManageSharesModal
        isOpen={isManageModalOpen}
        onClose={handleCloseManage}
        recipeSlug={recipeSlug}
        translations={t}
      />
    </>
  );
}
