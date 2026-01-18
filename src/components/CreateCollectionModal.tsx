"use client";

import { useState, useEffect } from "react";

import { Collection, CollectionWithRecipes } from "@/lib/collection-types";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: Collection) => void;
  editingCollection?: CollectionWithRecipes | null;
}

/**
 * Modal for creating or editing a collection.
 * Includes name, description, and cover image URL fields.
 */
export function CreateCollectionModal({
  isOpen,
  onClose,
  onSave,
  editingCollection,
}: CreateCollectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editingCollection;

  // Reset form when modal opens/closes or editing collection changes
  useEffect(() => {
    if (isOpen) {
      if (editingCollection) {
        setName(editingCollection.name);
        setDescription(editingCollection.description ?? "");
        setCoverImageUrl(editingCollection.coverImageUrl ?? "");
      } else {
        setName("");
        setDescription("");
        setCoverImageUrl("");
      }
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, editingCollection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditMode
        ? `/api/collections/${editingCollection.id}`
        : "/api/collections";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save collection");
      }

      onSave(data.collection);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCollection) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections/${editingCollection.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete collection");
      }

      onClose();
      // Trigger a page refresh to update the collections list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
        className={`fixed z-50 flex flex-col bg-slate-900
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl
          md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[500px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "Edit Collection" : "Create Collection"}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {/* Error message */}
          {error && (
            <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name field */}
            <div>
              <label
                htmlFor="collection-name"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="collection-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g., Weeknight Dinners"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {name.length}/100
              </p>
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="collection-description"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Description
              </label>
              <textarea
                id="collection-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description"
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Cover image URL field */}
            <div>
              <label
                htmlFor="collection-cover"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Cover Image URL
              </label>
              <input
                id="collection-cover"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Collection"}
            </button>

            {isEditMode && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full rounded-xl bg-slate-800 py-3 font-medium text-red-400 transition hover:bg-slate-700"
              >
                Delete Collection
              </button>
            )}

            {isEditMode && showDeleteConfirm && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3">
                <p className="mb-3 text-sm text-red-200">
                  Are you sure? This will remove the collection but not the
                  recipes.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 text-slate-400 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
