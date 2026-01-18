'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeSharingTranslations } from '@/lib/translations/recipe-sharing';

interface ForkButtonProps {
  recipeSlug: string;
  alreadyForked: boolean;
  forkedRecipeSlug?: string;
  translations: RecipeSharingTranslations;
  className?: string;
}

const ForkIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const LoadingSpinner = () => (
  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
);

/**
 * Button to fork a shared recipe into own collection
 */
export function ForkButton({
  recipeSlug,
  alreadyForked,
  forkedRecipeSlug,
  translations: t,
  className = '',
}: ForkButtonProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFork = useCallback(async () => {
    setIsForking(true);
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/fork`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fork recipe');
        return;
      }

      // Navigate to the forked recipe
      router.push(`/recipes/${data.slug}`);
    } catch (err) {
      console.error('Error forking recipe:', err);
      setError('Failed to fork recipe');
    } finally {
      setIsForking(false);
    }
  }, [recipeSlug, router]);

  const handleViewCopy = useCallback(() => {
    if (forkedRecipeSlug) {
      router.push(`/recipes/${forkedRecipeSlug}`);
    }
  }, [forkedRecipeSlug, router]);

  if (alreadyForked && forkedRecipeSlug) {
    return (
      <button
        onClick={handleViewCopy}
        className={`inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition ${className}`}
      >
        <ForkIcon />
        {t.viewMyCopy}
      </button>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={handleFork}
        disabled={isForking}
        className={`inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isForking ? <LoadingSpinner /> : <ForkIcon />}
        {isForking ? 'Forking...' : t.fork}
      </button>
      {error && (
        <span className="mt-1 text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
