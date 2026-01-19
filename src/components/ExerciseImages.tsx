'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ExerciseImagesProps {
  exerciseName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hasImages?: boolean; // If false, don't attempt to load images (prevents 400 errors)
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-28 h-28 sm:w-32 sm:h-32'
};

// Must match server-side VARCHAR(255) limit in exercise-library.ts
const MAX_EXERCISE_NAME_LENGTH = 255;

/**
 * Normalize exercise name for URL paths
 * Must match server-side normalizeExerciseName in exercise-library.ts
 */
export function normalizeForUrl(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  // Match server-side VARCHAR(255) limit
  if (normalized.length > MAX_EXERCISE_NAME_LENGTH) {
    return normalized.substring(0, MAX_EXERCISE_NAME_LENGTH);
  }

  return normalized;
}

/**
 * Display exercise images with position toggle (start/end position)
 * Left-aligned component for use in exercise cards
 */
export function ExerciseImages({
  exerciseName,
  className = '',
  size = 'md',
  hasImages = true // Default to true for backward compatibility
}: ExerciseImagesProps) {
  const [activeIndex, setActiveIndex] = useState<1 | 2>(1);
  const [loadError, setLoadError] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({ 1: true, 2: true });

  const normalizedName = normalizeForUrl(exerciseName);
  const imageUrl = (index: 1 | 2) => `/api/exercises/${normalizedName}/images/${index}`;

  // If we know images aren't available, render nothing (prevents 400 errors)
  if (!hasImages) {
    return null;
  }

  // If both images failed to load, show nothing
  if (loadError[1] && loadError[2]) {
    return null;
  }

  const handleImageLoad = (index: number) => {
    setIsLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setLoadError(prev => ({ ...prev, [index]: true }));
    setIsLoading(prev => ({ ...prev, [index]: false }));
    // If current active image failed, try switching to the other
    if (index === activeIndex) {
      const otherIndex = activeIndex === 1 ? 2 : 1;
      if (!loadError[otherIndex]) {
        setActiveIndex(otherIndex as 1 | 2);
      }
    }
  };

  return (
    <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-800">
        {/* Loading placeholder */}
        {isLoading[activeIndex] && !loadError[activeIndex] && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 animate-pulse rounded-full bg-slate-700" />
          </div>
        )}

        {/* Active image */}
        {!loadError[activeIndex] && (
          <Image
            src={imageUrl(activeIndex)}
            alt={`${exerciseName} - position ${activeIndex}`}
            fill
            sizes={size === 'lg' ? '128px' : size === 'md' ? '80px' : '64px'}
            className={`object-cover transition-opacity duration-200 ${
              isLoading[activeIndex] ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => handleImageLoad(activeIndex)}
            onError={() => handleImageError(activeIndex)}
          />
        )}

        {/* Position toggle dots */}
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1.5">
          {([1, 2] as const).map((idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (!loadError[idx]) {
                  setActiveIndex(idx);
                }
              }}
              disabled={loadError[idx]}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                activeIndex === idx
                  ? 'bg-emerald-400 scale-110'
                  : loadError[idx]
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Show ${idx === 1 ? 'start' : 'end'} position`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for timeline/list views
 */
export function ExerciseImageThumbnail({
  exerciseName,
  className = '',
  hasImages = true // Default to true for backward compatibility
}: {
  exerciseName: string;
  className?: string;
  hasImages?: boolean; // If false, don't attempt to load images (prevents 400 errors)
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedName = normalizeForUrl(exerciseName);
  const imageUrl = `/api/exercises/${normalizedName}/images/1`;

  // If we know images aren't available, render nothing (prevents 400 errors)
  if (!hasImages) {
    return null;
  }

  if (hasError) {
    return null;
  }

  return (
    <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 animate-pulse rounded-full bg-slate-700" />
        </div>
      )}
      <Image
        src={imageUrl}
        alt={exerciseName}
        fill
        sizes="40px"
        className={`object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}
