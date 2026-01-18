'use client';

import { useState, useCallback } from 'react';

interface UseFavoriteResult {
  isFavorite: boolean;
  isToggling: boolean;
  error: string | null;
  toggle: () => Promise<void>;
}

/**
 * Hook for managing recipe favorite status with optimistic updates
 */
export function useFavorite(
  recipeSlug: string,
  initialIsFavorite: boolean
): UseFavoriteResult {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    // Prevent multiple simultaneous toggles
    if (isToggling) return;

    setIsToggling(true);
    setError(null);

    // Optimistic update
    const previousValue = isFavorite;
    setIsFavorite(!previousValue);

    try {
      const method = previousValue ? 'DELETE' : 'POST';
      const res = await fetch(`/api/recipes/${recipeSlug}/favorite`, {
        method,
      });

      if (!res.ok) {
        const data = await res.json();
        // Revert on error
        setIsFavorite(previousValue);
        setError(data.error || 'Failed to update favorite');
        return;
      }

      // Confirm the update from server (in case of race conditions)
      const data = await res.json();
      setIsFavorite(data.isFavorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on error
      setIsFavorite(previousValue);
      setError('Failed to update favorite');
    } finally {
      setIsToggling(false);
    }
  }, [recipeSlug, isFavorite, isToggling]);

  return {
    isFavorite,
    isToggling,
    error,
    toggle,
  };
}
