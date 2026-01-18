'use client';

import { useState, useCallback } from 'react';
import { MySharedRecipe, SharePermission } from '@/lib/recipe-sharing-types';

interface ShareRecipeInput {
  recipientEmail: string;
  permission?: SharePermission;
  message?: string;
}

interface ShareRecipeResult {
  shareId: number;
  sharedWith: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Hook for managing recipe sharing operations
 */
export function useRecipeSharing(recipeSlug: string) {
  const [shares, setShares] = useState<MySharedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all shares for this recipe
   */
  const fetchShares = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch shares');
        return;
      }

      setShares(data.shares);
    } catch (err) {
      console.error('Error fetching shares:', err);
      setError('Failed to fetch shares');
    } finally {
      setIsLoading(false);
    }
  }, [recipeSlug]);

  /**
   * Share recipe with a user
   */
  const shareRecipe = useCallback(async (input: ShareRecipeInput): Promise<ShareRecipeResult | null> => {
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to share recipe');
        return null;
      }

      // Add to local state
      await fetchShares();

      return data;
    } catch (err) {
      console.error('Error sharing recipe:', err);
      setError('Failed to share recipe');
      return null;
    }
  }, [recipeSlug, fetchShares]);

  /**
   * Remove a share
   */
  const removeShare = useCallback(async (shareId: number): Promise<boolean> => {
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share?shareId=${shareId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to remove share');
        return false;
      }

      // Remove from local state
      setShares((prev) => prev.filter((s) => s.shareId !== shareId));

      return true;
    } catch (err) {
      console.error('Error removing share:', err);
      setError('Failed to remove share');
      return false;
    }
  }, [recipeSlug]);

  /**
   * Update share permission
   */
  const updatePermission = useCallback(async (shareId: number, permission: SharePermission): Promise<boolean> => {
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeSlug}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, permission }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update permission');
        return false;
      }

      // Update local state
      setShares((prev) =>
        prev.map((s) =>
          s.shareId === shareId ? { ...s, permission } : s
        )
      );

      return true;
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
      return false;
    }
  }, [recipeSlug]);

  return {
    shares,
    isLoading,
    error,
    fetchShares,
    shareRecipe,
    removeShare,
    updatePermission,
  };
}
