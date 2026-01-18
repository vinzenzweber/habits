'use client';

import { useFavorite } from '@/hooks/useFavorite';

interface FavoriteButtonProps {
  recipeSlug: string;
  initialIsFavorite: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Heart button for favoriting/unfavoriting recipes.
 * Features optimistic UI updates via useFavorite hook.
 */
export function FavoriteButton({
  recipeSlug,
  initialIsFavorite,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const { isFavorite, isToggling, toggle } = useFavorite(
    recipeSlug,
    initialIsFavorite
  );

  // Size variants
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={isToggling}
      className={`flex items-center justify-center rounded-full bg-slate-900/80 backdrop-blur transition hover:bg-slate-800 ${sizeClasses[size]} ${className} ${isToggling ? 'opacity-50' : ''}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFavorite}
    >
      {isFavorite ? (
        // Filled heart - favorited
        <svg
          className={`${iconSizeClasses[size]} text-red-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        // Outline heart - not favorited
        <svg
          className={`${iconSizeClasses[size]} text-slate-300 hover:text-red-400`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}
