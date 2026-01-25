"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: number, name: string) => void;
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

export function CreateListModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateListModalProps) {
  const t = useTranslations("groceryModal");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setIsCreating(false);
      setError(null);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError(t("pleaseEnterListName"));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/grocery-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("failedToCreateList"));
        return;
      }

      onSuccess(data.id, data.name);
      onClose();
    } catch (err) {
      console.error("Error creating list:", err);
      setError(t("failedToCreateList"));
    } finally {
      setIsCreating(false);
    }
  }, [name, onSuccess, onClose, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isCreating) {
        e.preventDefault();
        handleCreate();
      }
    },
    [handleCreate, isCreating]
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-list-title"
        className="fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[400px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 id="create-list-title" className="text-lg font-semibold">{t("createGroceryList")}</h2>
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

            {/* Name input */}
            <div>
              <label
                htmlFor="list-name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                {t("listName")}
              </label>
              <input
                ref={inputRef}
                id="list-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("listNamePlaceholder")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none"
                disabled={isCreating}
                maxLength={100}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={isCreating || !name.trim()}
                className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? t("creating") : t("createList")}
              </button>
              <button
                onClick={onClose}
                disabled={isCreating}
                className="py-2 text-slate-400 transition hover:text-white disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
