'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoCaptureModal } from './PhotoCaptureModal';

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

const CameraIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export function RecipePageHeader() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageCaptured = (imageUrl: string) => {
    setIsModalOpen(false);
    // Navigate to new recipe form with pre-filled image
    router.push(`/recipes/new?image=${encodeURIComponent(imageUrl)}`);
  };

  return (
    <>
      <section className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Recipes
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-slate-700 p-2.5 text-slate-100 transition hover:bg-slate-600"
            aria-label="Import recipe from photo"
            title="Import from photo"
          >
            <CameraIcon />
          </button>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            <PlusIcon />
            Add Recipe
          </Link>
        </div>
      </section>

      <PhotoCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImageCaptured={handleImageCaptured}
      />
    </>
  );
}
