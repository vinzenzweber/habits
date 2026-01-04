'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ExerciseImagesProps {
  exerciseName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-28 h-28 sm:w-32 sm:h-32'
};

/**
 * Display exercise images with position toggle (start/end position)
 * Left-aligned component for use in exercise cards
 */
export function ExerciseImages({
  exerciseName,
  className = '',
  size = 'md'
}: ExerciseImagesProps) {
  const [activeIndex, setActiveIndex] = useState<1 | 2>(1);
  const [loadError, setLoadError] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({ 1: true, 2: true });

  const encodedName = encodeURIComponent(exerciseName);
  const imageUrl = (index: 1 | 2) => `/api/exercises/${encodedName}/images/${index}`;

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
  className = ''
}: {
  exerciseName: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const encodedName = encodeURIComponent(exerciseName);
  const imageUrl = `/api/exercises/${encodedName}/images/1`;

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
