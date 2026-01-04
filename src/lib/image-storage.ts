import fs from 'fs/promises';
import path from 'path';

const STORAGE_BASE = process.env.IMAGE_STORAGE_PATH || '/data/images';

export interface ImageStorageResult {
  storagePath: string;
  fileSizeBytes: number;
}

/**
 * Ensure the storage directory exists
 */
async function ensureStorageDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Save an image buffer to Railway volume storage
 */
export async function saveExerciseImage(
  normalizedName: string,
  imageIndex: 1 | 2,
  imageBuffer: Buffer
): Promise<ImageStorageResult> {
  // Runtime validation to ensure imageIndex is strictly 1 or 2
  if (imageIndex !== 1 && imageIndex !== 2) {
    throw new Error(`Invalid imageIndex "${imageIndex}". Expected 1 or 2.`);
  }

  // Validate normalizedName doesn't contain path traversal
  if (normalizedName.includes('..') || path.isAbsolute(normalizedName)) {
    throw new Error('Invalid normalizedName: path traversal detected');
  }

  const dir = path.join(STORAGE_BASE, normalizedName);
  await ensureStorageDir(dir);

  const filename = `image-${imageIndex}.jpg`;
  const storagePath = path.join(normalizedName, filename);
  const fullPath = path.join(STORAGE_BASE, storagePath);

  await fs.writeFile(fullPath, imageBuffer);

  return {
    storagePath,
    fileSizeBytes: imageBuffer.length
  };
}

/**
 * Get the full file path for an exercise image
 */
export function getImagePath(storagePath: string): string {
  return path.join(STORAGE_BASE, storagePath);
}

/**
 * Read an exercise image from storage
 */
export async function readExerciseImage(storagePath: string): Promise<Buffer> {
  // Validate storagePath doesn't contain path traversal
  if (storagePath.includes('..') || path.isAbsolute(storagePath)) {
    throw new Error('Invalid storagePath: path traversal detected');
  }

  const fullPath = getImagePath(storagePath);
  return fs.readFile(fullPath);
}

/**
 * Check if an image exists in storage
 */
export async function imageExists(storagePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(STORAGE_BASE, storagePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete an exercise image from storage
 */
export async function deleteExerciseImage(storagePath: string): Promise<void> {
  try {
    await fs.unlink(path.join(STORAGE_BASE, storagePath));
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Delete all images for an exercise
 */
export async function deleteExerciseImages(normalizedName: string): Promise<void> {
  const dir = path.join(STORAGE_BASE, normalizedName);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get the base storage path (for debugging/admin)
 */
export function getStorageBasePath(): string {
  return STORAGE_BASE;
}
