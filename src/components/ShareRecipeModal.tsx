'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RecipeSharingTranslations } from '@/lib/translations/recipe-sharing';

interface ShareRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeSlug: string;
  translations: RecipeSharingTranslations;
  onShareSuccess?: () => void;
}

interface FoundUser {
  id: number;
  name: string;
  email: string;
}

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-12 w-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export function ShareRecipeModal({
  isOpen,
  onClose,
  recipeSlug,
  translations: t,
  onShareSuccess,
}: ShareRecipeModalProps) {
  const tCommon = useTranslations('common');
  const tSharing = useTranslations('shareGroceryList');
  const [email, setEmail] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setFoundUser(null);
      setIsSearching(false);
      setPermission('view');
      setMessage('');
      setIsSharing(false);
      setError(null);
      setIsSelf(false);
      setSuccess(false);
    }
  }, [isOpen]);

  // Debounced email search
  useEffect(() => {
    if (!email.trim()) {
      setFoundUser(null);
      setIsSelf(false);
      setError(null);
      return;
    }

    // Basic email format check before searching
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFoundUser(null);
      setIsSelf(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      setIsSelf(false);

      try {
        const res = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        if (data.isSelf) {
          setIsSelf(true);
          setFoundUser(null);
        } else if (data.user) {
          setFoundUser(data.user);
        } else {
          setFoundUser(null);
        }
      } catch (err) {
        console.error('Error searching user:', err);
        setFoundUser(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  const handleShare = useCallback(async () => {
    if (!foundUser) return;

    setIsSharing(true);
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: foundUser.email,
          permission,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'Recipe already shared with this user') {
          setError(t.alreadyShared);
        } else {
          setError(data.error || t.shareError);
        }
        return;
      }

      setSuccess(true);
      onShareSuccess?.();

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error sharing recipe:', err);
      setError(t.shareError);
    } finally {
      setIsSharing(false);
    }
  }, [foundUser, recipeSlug, permission, message, t, onShareSuccess, onClose]);

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
          <h2 className="text-lg font-semibold">{t.shareRecipe}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            aria-label={tCommon('close')}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {success ? (
            // Success state
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-emerald-500/20 p-4">
                <CheckIcon />
              </div>
              <p className="text-lg font-medium text-white">{t.shareSuccess}</p>
              {foundUser && (
                <p className="mt-2 text-sm text-slate-400">
                  {t.sharedWith} {foundUser.name}
                </p>
              )}
            </div>
          ) : (
            // Share form
            <div className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="bg-red-500/20 text-red-200 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Email input */}
              <div>
                <label
                  htmlFor="share-email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  {t.recipientEmail}
                </label>
                <input
                  id="share-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.searchByEmail}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 px-4 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
                  disabled={isSharing}
                />
              </div>

              {/* Loading indicator */}
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  <span>{tSharing('searching')}</span>
                </div>
              )}

              {/* Self-share warning */}
              {isSelf && (
                <div className="rounded-lg bg-amber-500/20 p-3 text-sm text-amber-200">
                  {t.cannotShareWithSelf}
                </div>
              )}

              {/* User not found */}
              {!isSearching && email && !foundUser && !isSelf && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <div className="rounded-lg bg-slate-800 p-4 text-center text-sm text-slate-400">
                  {t.userNotFound}
                </div>
              )}

              {/* Found user card */}
              {foundUser && (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700">
                      <UserIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {foundUser.name}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {foundUser.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Permission selector */}
              {foundUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {tSharing('permission')}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPermission('view')}
                      className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        permission === 'view'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                      disabled={isSharing}
                    >
                      {t.canView}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermission('edit')}
                      className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        permission === 'edit'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                      disabled={isSharing}
                    >
                      {t.canEdit}
                    </button>
                  </div>
                </div>
              )}

              {/* Optional message */}
              {foundUser && (
                <div>
                  <label
                    htmlFor="share-message"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    {t.optionalMessage}
                  </label>
                  <textarea
                    id="share-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 px-4 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none resize-none"
                    disabled={isSharing}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleShare}
                  disabled={!foundUser || isSharing}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharing ? tSharing('sharing') : t.shareButton}
                </button>
                <button
                  onClick={onClose}
                  disabled={isSharing}
                  className="text-slate-400 hover:text-white py-2 transition disabled:opacity-50"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
