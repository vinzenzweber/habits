'use client';

import { useState, useCallback, useEffect } from 'react';
import { RecipeSharingTranslations } from '@/lib/translations/recipe-sharing';
import { MySharedRecipe, SharePermission } from '@/lib/recipe-sharing-types';

interface ManageSharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeSlug: string;
  translations: RecipeSharingTranslations;
}

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export function ManageSharesModal({
  isOpen,
  onClose,
  recipeSlug,
  translations: t,
}: ManageSharesModalProps) {
  const [shares, setShares] = useState<MySharedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingShareId, setUpdatingShareId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  // Fetch shares when modal opens
  useEffect(() => {
    if (!isOpen) {
      setShares([]);
      setIsLoading(true);
      setError(null);
      setConfirmRemoveId(null);
      return;
    }

    const fetchShares = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/recipes/${recipeSlug}/share`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load shares');
          return;
        }

        setShares(data.shares);
      } catch (err) {
        console.error('Error fetching shares:', err);
        setError('Failed to load shares');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShares();
  }, [isOpen, recipeSlug]);

  const handlePermissionChange = useCallback(async (shareId: number, newPermission: SharePermission) => {
    setUpdatingShareId(shareId);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, permission: newPermission }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update permission');
        return;
      }

      // Update local state
      setShares((prev) =>
        prev.map((s) =>
          s.shareId === shareId ? { ...s, permission: newPermission } : s
        )
      );
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
    } finally {
      setUpdatingShareId(null);
    }
  }, [recipeSlug]);

  const handleRemoveShare = useCallback(async (shareId: number) => {
    setUpdatingShareId(shareId);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share?shareId=${shareId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to remove share');
        return;
      }

      // Remove from local state
      setShares((prev) => prev.filter((s) => s.shareId !== shareId));
      setConfirmRemoveId(null);
    } catch (err) {
      console.error('Error removing share:', err);
      setError('Failed to remove share');
    } finally {
      setUpdatingShareId(null);
    }
  }, [recipeSlug]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed z-50 bg-slate-900 flex flex-col
          inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]
          md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[500px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">{t.manageSharing}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-500/20 text-red-200 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && shares.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400">{t.noShares}</p>
            </div>
          )}

          {/* Shares list */}
          {!isLoading && shares.length > 0 && (
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.shareId}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* User avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700">
                      <UserIcon />
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {share.sharedWith.name}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {share.sharedWith.email}
                      </p>
                    </div>

                    {/* Remove button */}
                    {confirmRemoveId === share.shareId ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRemoveShare(share.shareId)}
                          disabled={updatingShareId === share.shareId}
                          className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-400 disabled:opacity-50"
                        >
                          {updatingShareId === share.shareId ? '...' : 'Remove'}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(share.shareId)}
                        className="p-2 text-slate-400 hover:text-red-400 transition"
                        title={t.removeAccess}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>

                  {/* Permission selector */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handlePermissionChange(share.shareId, 'view')}
                      disabled={updatingShareId === share.shareId}
                      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
                        share.permission === 'view'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {t.canView}
                    </button>
                    <button
                      onClick={() => handlePermissionChange(share.shareId, 'edit')}
                      disabled={updatingShareId === share.shareId}
                      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
                        share.permission === 'edit'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {t.canEdit}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-white transition"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </>
  );
}
