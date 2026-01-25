"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { GroceryListPermission, GroceryListShareInfo } from "@/lib/grocery-types";

interface ShareGroceryListModalProps {
  isOpen: boolean;
  listId: number;
  listName: string;
  initialShares: GroceryListShareInfo[];
  onClose: () => void;
  onSharesChange: () => void;
}

interface FoundUser {
  id: number;
  name: string;
  email: string;
}

const CloseIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const UserIcon = () => (
  <svg
    className="h-10 w-10 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

export function ShareGroceryListModal({
  isOpen,
  listId,
  listName,
  initialShares,
  onClose,
  onSharesChange,
}: ShareGroceryListModalProps) {
  const t = useTranslations("shareGroceryList");
  const tSharing = useTranslations("sharing");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [permission, setPermission] = useState<GroceryListPermission>("edit");
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [shares, setShares] = useState<GroceryListShareInfo[]>(initialShares);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setFoundUser(null);
      setIsSearching(false);
      setPermission("edit");
      setIsSharing(false);
      setError(null);
      setIsSelf(false);
    }
  }, [isOpen]);

  // Update shares when initialShares changes
  useEffect(() => {
    setShares(initialShares);
  }, [initialShares]);

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
        const res = await fetch(
          `/api/users/search?email=${encodeURIComponent(email)}`
        );
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
        console.error("Error searching user:", err);
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
      const res = await fetch(`/api/grocery-lists/${listId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: foundUser.email,
          permission,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "List already shared with this user") {
          setError(t("alreadyShared"));
        } else {
          setError(data.error || t("failedToShare"));
        }
        return;
      }

      // Add to local shares list
      setShares([
        {
          shareId: data.shareId,
          userId: foundUser.id,
          userName: foundUser.name,
          userEmail: foundUser.email,
          permission,
          sharedAt: new Date(),
        },
        ...shares,
      ]);

      // Clear the form
      setEmail("");
      setFoundUser(null);
      onSharesChange();
    } catch (err) {
      console.error("Error sharing list:", err);
      setError(t("failedToShare"));
    } finally {
      setIsSharing(false);
    }
  }, [foundUser, listId, permission, shares, onSharesChange, t]);

  const handleRemoveShare = useCallback(
    async (shareId: number) => {
      try {
        const res = await fetch(
          `/api/grocery-lists/${listId}/share?shareId=${shareId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t("failedToRemove"));
          return;
        }

        // Remove from local shares list
        setShares(shares.filter((s) => s.shareId !== shareId));
        onSharesChange();
      } catch (err) {
        console.error("Error removing share:", err);
        setError(t("failedToRemove"));
      }
    },
    [listId, shares, onSharesChange, t]
  );

  const handleUpdatePermission = useCallback(
    async (shareId: number, newPermission: GroceryListPermission) => {
      try {
        const res = await fetch(`/api/grocery-lists/${listId}/share`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareId, permission: newPermission }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t("failedToUpdate"));
          return;
        }

        // Update local shares list
        setShares(
          shares.map((s) =>
            s.shareId === shareId ? { ...s, permission: newPermission } : s
          )
        );
        onSharesChange();
      } catch (err) {
        console.error("Error updating permission:", err);
        setError(t("failedToUpdate"));
      }
    },
    [listId, shares, onSharesChange, t]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[500px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div>
            <h2 className="text-lg font-semibold">{t("shareList")}</h2>
            <p className="text-sm text-slate-400">{listName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:text-white"
            aria-label={tCommon("close")}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Email input */}
            <div>
              <label
                htmlFor="share-email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                {t("shareWith")}
              </label>
              <input
                id="share-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tSharing("searchByEmail")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
                disabled={isSharing}
              />
            </div>

            {/* Loading indicator */}
            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                <span>{t("searching")}</span>
              </div>
            )}

            {/* Self-share warning */}
            {isSelf && (
              <div className="rounded-lg bg-amber-500/20 p-3 text-sm text-amber-200">
                {tSharing("cannotShareWithSelf")}
              </div>
            )}

            {/* User not found */}
            {!isSearching &&
              email &&
              !foundUser &&
              !isSelf &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <div className="rounded-lg bg-slate-800 p-4 text-center text-sm text-slate-400">
                  {tSharing("userNotFound")}
                </div>
              )}

            {/* Found user card */}
            {foundUser && (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700">
                    <UserIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {foundUser.name}
                    </p>
                    <p className="truncate text-sm text-slate-400">
                      {foundUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Permission selector */}
            {foundUser && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  {t("permission")}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPermission("view")}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                      permission === "view"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    disabled={isSharing}
                  >
                    {tSharing("canView")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermission("edit")}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                      permission === "edit"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    disabled={isSharing}
                  >
                    {tSharing("canEdit")}
                  </button>
                </div>
              </div>
            )}

            {/* Share button */}
            {foundUser && (
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSharing ? t("sharing") : t("shareList")}
              </button>
            )}

            {/* Current shares */}
            {shares.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-slate-300">
                  {tSharing("sharedWith")}
                </h3>
                <div className="space-y-2">
                  {shares.map((share) => (
                    <div
                      key={share.shareId}
                      className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                        <span className="text-xs text-slate-400">
                          {share.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {share.userName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {share.userEmail}
                        </p>
                      </div>
                      <select
                        value={share.permission}
                        onChange={(e) =>
                          handleUpdatePermission(
                            share.shareId,
                            e.target.value as GroceryListPermission
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
                      >
                        <option value="view">{tCommon("view")}</option>
                        <option value="edit">{tCommon("edit")}</option>
                      </select>
                      <button
                        onClick={() => handleRemoveShare(share.shareId)}
                        className="rounded-lg p-1 text-slate-500 transition hover:bg-red-500/20 hover:text-red-400"
                        aria-label={t('removeUserLabel', { name: share.userName })}
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
