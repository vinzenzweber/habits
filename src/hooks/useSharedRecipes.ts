'use client';

import { useState, useCallback } from 'react';
import { SharedRecipeWithMe } from '@/lib/recipe-sharing-types';

/**
 * Hook for fetching and managing recipes shared with the current user
 */
export function useSharedRecipes() {
  const [recipes, setRecipes] = useState<SharedRecipeWithMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch recipes shared with me
   */
  const fetchSharedRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/recipes/shared');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch shared recipes');
        return;
      }

      setRecipes(data.recipes);
    } catch (err) {
      console.error('Error fetching shared recipes:', err);
      setError('Failed to fetch shared recipes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fork a shared recipe
   */
  const forkRecipe = useCallback(async (recipeSlug: string): Promise<string | null> => {
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/fork`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fork recipe');
        return null;
      }

      return data.slug;
    } catch (err) {
      console.error('Error forking recipe:', err);
      setError('Failed to fork recipe');
      return null;
    }
  }, []);

  return {
    recipes,
    isLoading,
    error,
    fetchSharedRecipes,
    forkRecipe,
  };
}
