'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { validateImageFile, resizeImage, MAX_FILE_SIZE_MB } from '@/lib/image-utils';

export type PhotoCaptureResult =
  | { type: 'extracted'; slug: string }
  | { type: 'uploaded'; imageUrl: string };

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (result: PhotoCaptureResult) => void;
}

const CameraIcon = () => (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const GalleryIcon = () => (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const UploadIcon = () => (
  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export function PhotoCaptureModal({ isOpen, onClose, onImageCaptured }: PhotoCaptureModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect desktop breakpoint (md: 768px)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Cleanup preview URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setError(null);
      setIsUploading(false);
      setIsExtracting(false);
      setDragOver(false);
    }
  }, [isOpen, previewUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(url);
    setSelectedFile(file);
  }, [previewUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(url);
    setSelectedFile(file);
  }, [previewUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleReset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  }, [previewUrl]);

  /**
   * Convert a File to a base64 string (without the data URL prefix)
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:image/...;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleExtractRecipe = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setIsExtracting(true);
    setError(null);

    try {
      // Resize image client-side first
      const resizedBlob = await resizeImage(selectedFile);

      // Convert resized blob to base64
      const resizedFile = new File([resizedBlob], 'recipe.jpg', { type: 'image/jpeg' });
      const base64 = await fileToBase64(resizedFile);

      // Call the extraction API
      const response = await fetch('/api/recipes/extract-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract recipe');
      }

      // Notify parent with the extracted recipe slug
      onImageCaptured({ type: 'extracted', slug: data.slug });
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract recipe');
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  }, [selectedFile, onImageCaptured, fileToBase64]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const hasPreview = Boolean(previewUrl && selectedFile);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed z-50 bg-slate-900 flex flex-col
          inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]
          md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[500px] md:max-h-[80vh] md:rounded-xl md:border md:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">
            {hasPreview ? 'Review Photo' : 'Import Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-500/20 text-red-200 p-3 rounded text-sm mb-4">
              {error}
            </div>
          )}

          {hasPreview ? (
            // Preview step
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-800">
                <Image
                  src={previewUrl!}
                  alt="Recipe preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-white">
                        {isExtracting ? 'Extracting recipe...' : 'Uploading...'}
                      </p>
                      {isExtracting && (
                        <p className="text-xs text-slate-300 mt-1">
                          This may take a few seconds
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="text-sm text-slate-400">
                <p>{selectedFile!.name}</p>
                <p>{formatFileSize(selectedFile!.size)}</p>
                {selectedFile!.size > MAX_FILE_SIZE_MB * 0.8 * 1024 * 1024 && (
                  <p className="text-amber-400 mt-1">
                    Large file - will be resized before upload
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleExtractRecipe}
                  disabled={isUploading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (isExtracting ? 'Extracting...' : 'Uploading...') : 'Import Recipe'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isUploading}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition disabled:opacity-50"
                >
                  Choose Different Photo
                </button>
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  className="text-slate-400 hover:text-white py-2 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : isDesktop ? (
            // Desktop: Upload/drag-drop zone
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
                  ${dragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-slate-400">
                  <UploadIcon />
                  <p className="text-sm">
                    Drop image here or <span className="text-emerald-400">browse</span>
                  </p>
                  <p className="text-xs mt-2 text-slate-500">
                    JPEG, PNG, WebP, GIF, HEIC up to {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full text-slate-400 hover:text-white py-2 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            // Mobile: Camera and library buttons
            <div className="space-y-4">
              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Take photo button */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-6 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <CameraIcon />
                <span className="font-medium">Take Photo</span>
              </button>

              {/* Choose from library button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-6 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <GalleryIcon />
                <span className="font-medium">Choose from Library</span>
              </button>

              <p className="text-xs text-center text-slate-500">
                JPEG, PNG, WebP, GIF, HEIC up to {MAX_FILE_SIZE_MB}MB
              </p>

              <button
                onClick={onClose}
                className="w-full text-slate-400 hover:text-white py-2 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
