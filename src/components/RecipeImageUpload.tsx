'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { validateImageFile, resizeImage, generateImageId } from '@/lib/image-utils';
import type { RecipeImage } from '@/lib/recipe-types';

interface RecipeImageUploadProps {
  images: RecipeImage[];
  onChange: (images: RecipeImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

interface UploadingImage {
  id: string;
  preview: string;
  progress: number;
}

export function RecipeImageUpload({
  images,
  onChange,
  maxImages = 10,
  disabled = false,
}: RecipeImageUploadProps) {
  const [uploading, setUploading] = useState<UploadingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // Check total count
    const totalCount = images.length + uploading.length + fileArray.length;
    if (totalCount > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Process each file
    for (const file of fileArray) {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        continue;
      }

      const uploadId = generateImageId();
      const preview = URL.createObjectURL(file);

      // Add to uploading state
      setUploading(prev => [...prev, { id: uploadId, preview, progress: 0 }]);

      try {
        // Resize image client-side
        const resizedBlob = await resizeImage(file);

        // Update progress
        setUploading(prev =>
          prev.map(u => u.id === uploadId ? { ...u, progress: 50 } : u)
        );

        // Upload to server
        const formData = new FormData();
        formData.append('image', resizedBlob, `${uploadId}.jpg`);

        const response = await fetch('/api/recipes/images/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();

        // Add to images array
        const newImage: RecipeImage = {
          url: data.url,
          isPrimary: images.length === 0, // First image is primary
        };

        onChange([...images, newImage]);

        // Remove from uploading state
        setUploading(prev => prev.filter(u => u.id !== uploadId));
        URL.revokeObjectURL(preview);
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        setUploading(prev => prev.filter(u => u.id !== uploadId));
        URL.revokeObjectURL(preview);
      }
    }
  }, [images, uploading.length, maxImages, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleRemove = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // If we removed the primary image, make the first one primary
    if (images[index].isPrimary && newImages.length > 0) {
      newImages[0] = { ...newImages[0], isPrimary: true };
    }
    onChange(newImages);
  }, [images, onChange]);

  const handleSetPrimary = useCallback((index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange(newImages);
  }, [images, onChange]);

  const handleCaptionChange = useCallback((index: number, caption: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], caption: caption || undefined };
    onChange(newImages);
  }, [images, onChange]);

  const canAddMore = images.length + uploading.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
            ${dragOver
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-700 hover:border-slate-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
          <div className="text-slate-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">
              Drop images here or <span className="text-emerald-400">browse</span>
            </p>
            <p className="text-xs mt-2 text-slate-500">
              JPEG, PNG, WebP, GIF up to 10MB
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 text-red-200 p-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Image grid */}
      {(images.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Uploaded images */}
          {images.map((image, index) => (
            <div key={image.url} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                <Image
                  src={image.url}
                  alt={image.caption || `Recipe image ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-emerald-500 text-slate-950 text-xs font-medium px-2 py-1 rounded">
                  Primary
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    disabled={disabled}
                    className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                    title="Set as primary"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="p-2 bg-red-600 rounded-lg hover:bg-red-500 transition"
                  title="Remove"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Caption input */}
              <input
                type="text"
                placeholder="Caption (optional)"
                value={image.caption || ''}
                onChange={(e) => handleCaptionChange(index, e.target.value)}
                disabled={disabled}
                className="w-full mt-2 p-2 text-sm rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
              />
            </div>
          ))}

          {/* Uploading images */}
          {uploading.map((upload) => (
            <div key={upload.id} className="relative">
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                <Image
                  src={upload.preview}
                  alt="Uploading..."
                  fill
                  className="object-cover opacity-50"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              <div className="mt-2 h-1 bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image count */}
      <p className="text-xs text-slate-500">
        {images.length} of {maxImages} images
        {images.length === 0 && ' (at least 1 required)'}
      </p>
    </div>
  );
}
