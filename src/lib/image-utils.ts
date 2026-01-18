/**
 * Client-side image utilities for recipe image uploads
 */

// Maximum dimensions for uploaded images
export const MAX_IMAGE_DIMENSION = 2048;
export const JPEG_QUALITY = 0.85;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

// Allowed PDF types
export const ALLOWED_PDF_TYPES = ['application/pdf'];

// File type discriminator
export type ImportFileType = 'image' | 'pdf';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface ImportFileValidationResult {
  valid: boolean;
  error?: string;
  fileType?: ImportFileType;
}

/**
 * Validate an image file before upload
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Resize an image to fit within max dimensions while maintaining aspect ratio.
 * Returns a JPEG blob.
 *
 * Note: This always outputs JPEG format regardless of input format.
 * This means PNG transparency will be lost (replaced with white background).
 * This is intentional for recipe images as:
 * 1. Recipe photos rarely need transparency
 * 2. JPEG provides better compression for photographs
 * 3. Consistent output format simplifies storage and serving
 */
export async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions if needed
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_IMAGE_DIMENSION);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_IMAGE_DIMENSION);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Fill with white background first (for transparent PNGs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Generate a unique image ID using cryptographically secure random values
 */
export function generateImageId(): string {
  // Use crypto.randomUUID() for robust, collision-resistant ID generation
  return crypto.randomUUID();
}

/**
 * Validate a file for recipe import (supports both images and PDFs)
 */
export function validateImportFile(file: File): ImportFileValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isPdf = ALLOWED_PDF_TYPES.includes(file.type);

  if (!isImage && !isPdf) {
    return {
      valid: false,
      error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, HEIC, or PDF',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  return {
    valid: true,
    fileType: isPdf ? 'pdf' : 'image',
  };
}
