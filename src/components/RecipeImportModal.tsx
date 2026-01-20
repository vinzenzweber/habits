'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  validateImportFile,
  resizeImage,
  MAX_FILE_SIZE_MB,
  type ImportFileType,
} from '@/lib/image-utils';

export type RecipeImportResult =
  | { type: 'extracted'; slug: string }
  | { type: 'extracted-multiple'; recipes: Array<{ slug: string; title: string; pageNumber: number }>; skippedPages: number[] }
  | { type: 'uploaded'; imageUrl: string };

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (result: RecipeImportResult) => void;
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

const PdfIcon = () => (
  <svg className="w-16 h-16 text-red-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6" />
    <text x="6" y="17" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-12 h-12 text-emerald-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Accepted file types for input
const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf';

export function RecipeImportModal({ isOpen, onClose, onImageCaptured }: RecipeImportModalProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<ImportFileType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // PDF extraction progress
  const [extractionProgress, setExtractionProgress] = useState({
    currentPage: 0,
    totalPages: 0,
  });

  // Polling state for async PDF extraction
  const [pollingJobId, setPollingJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [partialResults, setPartialResults] = useState<Array<{
    slug: string;
    title: string;
    pageNumber: number;
  }>>([]);

  // Cancel state
  const [isCancelling, setIsCancelling] = useState(false);

  // Import results for multi-recipe PDFs
  const [importResults, setImportResults] = useState<{
    recipes: Array<{ slug: string; title: string; pageNumber: number }>;
    skippedPages: number[];
  } | null>(null);

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
      setFileType(null);
      setError(null);
      setIsUploading(false);
      setIsExtracting(false);
      setDragOver(false);
      setExtractionProgress({ currentPage: 0, totalPages: 0 });
      setImportResults(null);
      // Clear polling state
      setPollingJobId(null);
      setJobStatus(null);
      setPartialResults([]);
      setIsCancelling(false);
    }
  }, [isOpen, previewUrl]);

  const handleReset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setFileType(null);
    setError(null);
    setImportResults(null);
    setIsUploading(false);
    setIsExtracting(false);
    setExtractionProgress({ currentPage: 0, totalPages: 0 });
    // Clear polling state
    setPollingJobId(null);
    setJobStatus(null);
    setPartialResults([]);
    setIsCancelling(false);
  }, [previewUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    setError(null);
    setImportResults(null);

    // Validate file
    const validation = validateImportFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFileType(validation.fileType || null);

    // Create preview for images only
    if (validation.fileType === 'image') {
      const url = URL.createObjectURL(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
    } else {
      // Clear preview for PDFs
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
    setSelectedFile(file);
  }, [previewUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    setError(null);
    setImportResults(null);

    // Validate file
    const validation = validateImportFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFileType(validation.fileType || null);

    // Create preview for images only
    if (validation.fileType === 'image') {
      const url = URL.createObjectURL(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
    } else {
      // Clear preview for PDFs
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
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

  const parseResponseJson = useCallback(async <T,>(response: Response) => {
    const text = await response.text();
    if (!text) {
      return { data: null as T | null, text: '' };
    }
    try {
      return { data: JSON.parse(text) as T, text };
    } catch {
      return { data: null as T | null, text };
    }
  }, []);

  const handleCancelExtraction = useCallback(async () => {
    if (!pollingJobId) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/extract-from-pdf/${pollingJobId}`, {
        method: 'DELETE',
      });

      const { data } = await parseResponseJson<{ error?: string }>(response);

      if (!response.ok) {
        setError(data?.error || 'Failed to cancel extraction');
        setIsCancelling(false);
        return;
      }

      setIsExtracting(false);
      setIsUploading(false);
      setJobStatus('cancelled');
      setIsCancelling(false);
      handleReset();
    } catch {
      setError('Failed to cancel extraction');
      setIsCancelling(false);
    }
  }, [pollingJobId, handleReset, parseResponseJson]);

  // Polling effect for async PDF extraction
  useEffect(() => {
    // Only poll when we have a job ID and job is still in progress
    if (!pollingJobId) return;
    if (jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'cancelled') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/recipes/extract-from-pdf/${pollingJobId}`);

        const { data } = await parseResponseJson<{
          status: string;
          progress: { currentPage: number; totalPages: number };
          recipes: Array<{ slug: string; title: string; pageNumber: number }>;
          skippedPages?: number[];
          error?: string;
        }>(response);

        if (!response.ok) {
          setError(data?.error || 'Failed to check extraction status');
          setJobStatus('failed');
          setIsExtracting(false);
          setIsUploading(false);
          return;
        }

        if (!data) {
          setError('Unexpected response from server');
          setJobStatus('failed');
          setIsExtracting(false);
          setIsUploading(false);
          return;
        }

        setJobStatus(data.status);
        setExtractionProgress({
          currentPage: data.progress.currentPage,
          totalPages: data.progress.totalPages,
        });
        setPartialResults(data.recipes || []);

        if (data.status === 'completed') {
          setIsExtracting(false);
          setIsUploading(false);
          if (data.recipes.length === 0) {
            setError('No recipes were found in this PDF. Please try a different file.');
          } else if (data.recipes.length === 1) {
            // Single recipe - navigate directly
            onImageCaptured({ type: 'extracted', slug: data.recipes[0].slug });
            onClose();
          } else {
            // Multiple recipes - show selection UI
            setImportResults({
              recipes: data.recipes,
              skippedPages: data.skippedPages || [],
            });
          }
        } else if (data.status === 'failed') {
          setError(data.error || 'Recipe extraction failed');
          setIsExtracting(false);
          setIsUploading(false);
        } else if (data.status === 'cancelled') {
          // User-initiated cancellation - reset modal without errors
          handleReset();
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't fail on transient network errors - keep polling
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [pollingJobId, jobStatus, onImageCaptured, handleReset, parseResponseJson]);

  /**
   * Convert a File to a base64 string (without the data URL prefix)
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:image/...;base64, or data:application/pdf;base64,)
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
      if (fileType === 'pdf') {
        // Handle PDF extraction (async with polling)
        const base64 = await fileToBase64(selectedFile);

        const response = await fetch('/api/recipes/extract-from-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64 }),
        });

        const { data } = await parseResponseJson<{ jobId?: number; error?: string }>(
          response
        );

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to extract recipe from PDF');
        }

        if (!data || typeof data.jobId !== 'number') {
          throw new Error('Unexpected response from server');
        }

        // API returns 202 with jobId for async processing
        setPollingJobId(data.jobId);
        setJobStatus('pending');
        setPartialResults([]);
        // Polling effect will handle the rest - keep isUploading/isExtracting true
        // Exit early to avoid the finally block resetting loading states
        return;
      } else {
        // Handle image extraction (existing logic)
        const resizedBlob = await resizeImage(selectedFile);
        const resizedFile = new File([resizedBlob], 'recipe.jpg', { type: 'image/jpeg' });
        const base64 = await fileToBase64(resizedFile);

        const response = await fetch('/api/recipes/extract-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        const { data } = await parseResponseJson<{ slug?: string; error?: string }>(
          response
        );

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to extract recipe');
        }

        if (!data?.slug) {
          throw new Error('Unexpected response from server');
        }

        // Notify parent with the extracted recipe slug
        onImageCaptured({ type: 'extracted', slug: data.slug });
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract recipe');
      // Reset loading states on error
      setIsUploading(false);
      setIsExtracting(false);
      return;
    }
    // Reset loading states on successful image extraction (PDF uses polling)
    setIsUploading(false);
    setIsExtracting(false);
  }, [selectedFile, fileType, onImageCaptured, fileToBase64, parseResponseJson]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRecipeClick = (slug: string) => {
    onClose();
    router.push(`/recipes/${slug}`);
  };

  if (!isOpen) return null;

  const hasPreview = Boolean(selectedFile);
  const showImportResults = importResults !== null;

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
            {showImportResults ? 'Import Complete' : hasPreview ? 'Review File' : 'Import Recipe'}
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

          {showImportResults ? (
            // Import results step (for multi-recipe PDFs)
            <div className="space-y-4">
              <div className="text-center">
                <CheckIcon />
                <h3 className="text-lg font-semibold mt-2">Import Complete</h3>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                <p className="text-emerald-400">
                  ✓ {importResults.recipes.length} recipe{importResults.recipes.length !== 1 ? 's' : ''} imported
                </p>
                {importResults.skippedPages.length > 0 && (
                  <p className="text-slate-400 text-sm">
                    {importResults.skippedPages.length} page{importResults.skippedPages.length !== 1 ? 's' : ''} skipped (no recipe detected)
                  </p>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {importResults.recipes.map((recipe) => (
                  <button
                    key={recipe.slug}
                    onClick={() => handleRecipeClick(recipe.slug)}
                    className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                  >
                    <span className="text-white">{recipe.title}</span>
                    {recipe.pageNumber > 0 && (
                      <span className="text-slate-400 text-sm ml-2">(page {recipe.pageNumber})</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-medium transition"
              >
                Done
              </button>
            </div>
          ) : hasPreview ? (
            // Preview step
            <div className="space-y-4">
              {/* File preview */}
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-800">
                {fileType === 'pdf' ? (
                  // PDF preview
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <PdfIcon />
                    <p className="font-medium text-white text-center break-all">{selectedFile?.name}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Click Import to extract recipes
                    </p>
                  </div>
                ) : (
                  // Image preview
                  <Image
                    src={previewUrl!}
                    alt="Recipe preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />

                      {/* PDF extraction with polling progress */}
                      {isExtracting && fileType === 'pdf' && pollingJobId ? (
                        <>
                          <p className="text-sm text-white mb-2">
                            {extractionProgress.totalPages > 0
                              ? `Processing page ${extractionProgress.currentPage} of ${extractionProgress.totalPages}...`
                              : jobStatus === 'pending'
                                ? 'Starting extraction...'
                                : 'Analyzing PDF...'}
                          </p>

                          {extractionProgress.totalPages > 0 && (
                            <>
                              <p className="text-xs text-slate-300 mb-2">
                                {partialResults.length} {partialResults.length === 1 ? 'recipe' : 'recipes'} extracted
                              </p>

                              {/* Progress bar */}
                              <div className="w-full max-w-xs mx-auto bg-slate-700 rounded-full h-2 mb-3">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${extractionProgress.totalPages > 0 ? (extractionProgress.currentPage / extractionProgress.totalPages) * 100 : 0}%`
                                  }}
                                />
                              </div>

                              {/* Partial results list */}
                              {partialResults.length > 0 && (
                                <div className="text-left max-w-xs mx-auto mt-3 max-h-24 overflow-y-auto">
                                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                                    Recipes found:
                                  </p>
                                  <ul className="text-xs text-slate-300 space-y-0.5">
                                    {partialResults.map((recipe) => (
                                      <li key={recipe.slug} className="flex items-center gap-1">
                                        <span className="text-emerald-400">✓</span>
                                        <span className="truncate">{recipe.title}</span>
                                        <span className="text-slate-500 text-xs shrink-0">p.{recipe.pageNumber}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}

                          {(jobStatus === 'processing' || jobStatus === 'pages_queued') && (
                            <button
                              type="button"
                              data-testid="cancel-extraction-button"
                              disabled={isCancelling}
                              onClick={handleCancelExtraction}
                              className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                            >
                              {isCancelling && (
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              )}
                              {isCancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-white">
                            {isExtracting ? 'Extracting recipe...' : 'Processing...'}
                          </p>
                          {isExtracting && (
                            <p className="text-xs text-slate-300 mt-1">
                              This may take a few seconds
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="text-sm text-slate-400">
                <p>{selectedFile!.name}</p>
                <p>{formatFileSize(selectedFile!.size)}</p>
                {fileType === 'image' && selectedFile!.size > MAX_FILE_SIZE_MB * 0.8 * 1024 * 1024 && (
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
                  {isUploading ? (isExtracting ? 'Extracting...' : 'Processing...') : 'Import Recipe'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isUploading}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition disabled:opacity-50"
                >
                  Choose Different File
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
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-slate-400">
                  <UploadIcon />
                  <p className="text-sm">
                    Drop file here or <span className="text-emerald-400">browse</span>
                  </p>
                  <p className="text-xs mt-2 text-slate-500">
                    JPEG, PNG, WebP, GIF, HEIC, or PDF up to {MAX_FILE_SIZE_MB}MB
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
                accept={ACCEPTED_FILE_TYPES}
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
                <span className="font-medium">Choose File</span>
              </button>

              <p className="text-xs text-center text-slate-500">
                JPEG, PNG, WebP, GIF, HEIC, or PDF up to {MAX_FILE_SIZE_MB}MB
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

// Re-export for backwards compatibility during transition
export { RecipeImportModal as PhotoCaptureModal };
export type { RecipeImportResult as PhotoCaptureResult };
