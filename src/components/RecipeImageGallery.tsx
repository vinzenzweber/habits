"use client";

import Image from "next/image";
import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { RecipeImage } from "@/lib/recipe-types";

interface RecipeImageGalleryProps {
  images: RecipeImage[];
  title: string; // For alt text fallback
}

/**
 * Image carousel/gallery component for recipe detail page.
 * Shows a hero image with navigation dots and swipe support for multiple images.
 * Primary image is always displayed first.
 */
export function RecipeImageGallery({ images, title }: RecipeImageGalleryProps) {
  const t = useTranslations("recipeGallery");

  // Sort images so primary image is first
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<Set<number>>(new Set());
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const hasMultipleImages = sortedImages.length > 1;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
  }, [sortedImages.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  }, [sortedImages.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;

      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStart - touchEnd;

      // Minimum swipe distance of 50px
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }

      setTouchStart(null);
    },
    [touchStart, goToNext, goToPrev]
  );

  const handleImageError = useCallback((index: number) => {
    setImageError((prev) => new Set(prev).add(index));
  }, []);

  const currentImage = sortedImages[currentIndex];
  const hasError = imageError.has(currentIndex);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-800">
      {/* Image container */}
      <div
        className="relative aspect-video w-full"
        onTouchStart={hasMultipleImages ? handleTouchStart : undefined}
        onTouchEnd={hasMultipleImages ? handleTouchEnd : undefined}
      >
        {hasError ? (
          <div className="flex h-full items-center justify-center text-6xl">
            🍳
          </div>
        ) : (
          <Image
            src={currentImage.url}
            alt={currentImage.caption ?? title}
            fill
            className="object-cover"
            onError={() => handleImageError(currentIndex)}
            priority={currentIndex === 0}
            // Use unoptimized to avoid SSRF - user-provided URLs bypass Next.js image optimization
            unoptimized
          />
        )}

        {/* Desktop navigation buttons */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white transition hover:bg-slate-950/90 sm:block"
              aria-label={t("previousImage")}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white transition hover:bg-slate-950/90 sm:block"
              aria-label={t("nextImage")}
            >
              <svg
                className="h-5 w-5"
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
            </button>
          </>
        )}

        {/* Image caption */}
        {currentImage.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 pt-8">
            <p className="text-sm text-white">{currentImage.caption}</p>
          </div>
        )}
      </div>

      {/* Navigation dots */}
      {hasMultipleImages && (
        <div className="flex justify-center gap-2 py-3">
          {sortedImages.map((image, index) => (
            <button
              key={image.url}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition ${
                index === currentIndex
                  ? "bg-emerald-400"
                  : "bg-slate-600 hover:bg-slate-500"
              }`}
              aria-label={t("goToImage", { index: index + 1 })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
