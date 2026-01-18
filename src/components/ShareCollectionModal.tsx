"use client";

import { useState, useEffect } from "react";
import { CollectionWithRecipes } from "@/lib/collection-types";

interface ShareCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionWithRecipes | null;
  onShareSuccess?: () => void;
}

type ShareState = "input" | "loading" | "success";

/**
 * Modal for sharing a collection with another user.
 * Implements copy-on-share: recipient gets their own copies of the collection and recipes.
 */
export function ShareCollectionModal({
  isOpen,
  onClose,
  collection,
  onShareSuccess,
}: ShareCollectionModalProps) {
  const [state, setState] = useState<ShareState>("input");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string>("");
  const [copiedRecipeCount, setCopiedRecipeCount] = useState(0);
  const [showRecipes, setShowRecipes] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setState("input");
      setEmail("");
      setMessage("");
      setError(null);
      setRecipientName("");
      setCopiedRecipeCount(0);
      setShowRecipes(false);
    }
  }, [isOpen]);

  const handleShare = async () => {
    if (!email.trim() || !collection) return;

    setState("loading");
    setError(null);

    try {
      const response = await fetch(`/api/collections/${collection.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email.trim(),
          message: message.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to share collection");
      }

      setRecipientName(data.recipientName);
      setCopiedRecipeCount(data.copiedRecipeCount);
      setState("success");
      onShareSuccess?.();
    } catch (err) {
      setState("input");
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (!isOpen || !collection) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={state !== "loading" ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[450px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold">
            {state === "success" ? "Collection Shared!" : "Share Collection"}
          </h2>
          {state !== "loading" && (
            <button
              onClick={onClose}
              className="text-2xl leading-none text-slate-400 hover:text-white"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {state === "input" && (
            <div className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="rounded bg-red-500/20 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {/* Collection preview */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-sm text-slate-400">Sharing</p>
                <p className="text-lg font-medium text-white">
                  {collection.name}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {collection.recipeCount}{" "}
                  {collection.recipeCount === 1 ? "recipe" : "recipes"} will be
                  copied
                </p>

                {/* Expandable recipe list */}
                {collection.recipes.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowRecipes(!showRecipes)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {showRecipes ? "Hide" : "Show"} recipes
                      <svg
                        className={`h-4 w-4 transition ${showRecipes ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showRecipes && (
                      <ul className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                        {collection.recipes.map((recipe) => (
                          <li
                            key={recipe.slug}
                            className="truncate text-xs text-slate-300"
                          >
                            • {recipe.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Email input */}
              <div>
                <label
                  htmlFor="recipient-email"
                  className="mb-1 block text-sm font-medium text-slate-300"
                >
                  Recipient&apos;s Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="recipient-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Message input */}
              <div>
                <label
                  htmlFor="share-message"
                  className="mb-1 block text-sm font-medium text-slate-300"
                >
                  Personal Message
                </label>
                <textarea
                  id="share-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Optional message to include"
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Info text */}
              <p className="text-xs text-slate-500">
                The recipient will receive their own copies of this collection
                and all its recipes. They can modify their copies without
                affecting your originals.
              </p>
            </div>
          )}

          {state === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <p className="text-slate-300">Sharing collection...</p>
              <p className="mt-1 text-xs text-slate-500">
                Copying {collection.recipeCount} recipes
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {/* Success checkmark */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <svg
                  className="h-8 w-8 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-white">
                Collection sent to {recipientName}!
              </h3>

              <p className="mb-4 text-sm text-slate-400">
                They received copies of {copiedRecipeCount}{" "}
                {copiedRecipeCount === 1 ? "recipe" : "recipes"} they can edit.
              </p>

              <button
                onClick={onClose}
                className="rounded-xl bg-emerald-500 px-8 py-3 font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer - only show in input state */}
        {state === "input" && (
          <div className="border-t border-slate-700 p-4">
            <button
              onClick={handleShare}
              disabled={!email.trim()}
              className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Share Collection
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 text-slate-400 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
