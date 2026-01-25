"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { CollectionSummary, ReceivedCollection } from "@/lib/collection-types";

interface CollectionsDropdownProps {
  collections: CollectionSummary[];
  receivedCollections: ReceivedCollection[];
  onCreateCollection: () => void;
}

// ============================================
// Icons
// ============================================

const FolderIcon = () => (
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
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4 text-slate-400"
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
);

const ChevronRightIcon = () => (
  <svg
    className="h-3 w-3 text-slate-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const PlusIcon = () => (
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
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const UserIcon = () => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

// ============================================
// Component
// ============================================

export function CollectionsDropdown({
  collections,
  receivedCollections,
  onCreateCollection,
}: CollectionsDropdownProps) {
  const t = useTranslations("collections");
  const tSharing = useTranslations("sharing");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleCreateClick = () => {
    setIsOpen(false);
    onCreateCollection();
  };

  const hasReceivedCollections = receivedCollections.length > 0;
  const totalCount = collections.length + receivedCollections.length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
          isOpen
            ? "bg-slate-700 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <FolderIcon />
        <span>{t("collections")}</span>
        {totalCount > 0 && (
          <span className="text-xs text-slate-400">({totalCount})</span>
        )}
        <ChevronDownIcon />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute left-0 z-50 mt-1 w-64 rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-lg"
          role="menu"
          aria-orientation="vertical"
        >
          {/* My Collections section */}
          {collections.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("myCollections")}
              </div>
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/recipes/collections/${collection.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                  role="menuitem"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderIcon />
                    <span className="truncate">{collection.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-xs">({collection.recipeCount})</span>
                    <ChevronRightIcon />
                  </div>
                </Link>
              ))}
            </>
          )}

          {/* Empty state for my collections */}
          {collections.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">
              {t("noCollections")}
            </div>
          )}

          {/* Shared with me section */}
          {hasReceivedCollections && (
            <>
              <div className="my-1 border-t border-slate-700" />
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("sharedWithMe")}
              </div>
              {receivedCollections.map((received) => (
                <Link
                  key={received.collection.id}
                  href={`/recipes/collections/${received.collection.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                  role="menuitem"
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserIcon />
                    <span className="truncate">
                      {tSharing("fromLabel")} {received.sharedBy.name}
                    </span>
                  </div>
                  <ChevronRightIcon />
                </Link>
              ))}
            </>
          )}

          {/* Create new collection */}
          <div className="my-1 border-t border-slate-700" />
          <button
            onClick={handleCreateClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-400 transition hover:bg-slate-700"
            role="menuitem"
          >
            <PlusIcon />
            <span>{t("createNewCollection")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
