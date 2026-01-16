/**
 * Recipe image storage module
 * Follows the same pattern as exercise image storage
 * Stores images at /data/images/recipes/{userId}/{imageId}.jpg
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_BASE = process.env.IMAGE_STORAGE_PATH || '/data/images';
const RECIPES_DIR = 'recipes';

export interface RecipeImageStorageResult {
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

/** Pattern for valid path components: alphanumeric, dashes, underscores only */
const VALID_PATH_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Check if a path component is valid (does not throw, returns boolean)
 * Use this for validation checks in route handlers
 */
export function isValidPathComponent(component: string): boolean {
  if (component.includes('..') || path.isAbsolute(component)) {
    return false;
  }
  return VALID_PATH_PATTERN.test(component);
}

/**
 * Validate path components to prevent path traversal attacks (throws on invalid)
 * Use this in internal storage functions where invalid input is a programming error
 */
function validatePathComponent(component: string, name: string): void {
  if (!isValidPathComponent(component)) {
    throw new Error(`Invalid ${name}: contains invalid characters or path traversal`);
  }
}

/**
 * Save a recipe image to storage
 */
export async function saveRecipeImage(
  userId: string,
  imageId: string,
  imageBuffer: Buffer
): Promise<RecipeImageStorageResult> {
  // Validate inputs
  validatePathComponent(userId, 'userId');
  validatePathComponent(imageId, 'imageId');

  const dir = path.join(STORAGE_BASE, RECIPES_DIR, userId);
  await ensureStorageDir(dir);

  const filename = `${imageId}.jpg`;
  const storagePath = path.join(RECIPES_DIR, userId, filename);
  const fullPath = path.join(STORAGE_BASE, storagePath);

  await fs.writeFile(fullPath, imageBuffer);

  return {
    storagePath,
    fileSizeBytes: imageBuffer.length,
  };
}

/**
 * Get the full file path for a recipe image
 */
export function getRecipeImagePath(storagePath: string): string {
  return path.join(STORAGE_BASE, storagePath);
}

/**
 * Read a recipe image from storage
 * @param storagePath - Expected format: "recipes/{userId}/{imageId}.jpg"
 */
export async function readRecipeImage(storagePath: string): Promise<Buffer> {
  // Validate storagePath doesn't contain path traversal
  if (storagePath.includes('..') || path.isAbsolute(storagePath)) {
    throw new Error('Invalid storagePath: path traversal detected');
  }

  // Validate individual path components for consistent security with saveRecipeImage
  // Expected format: "recipes/{userId}/{imageId}.jpg"
  const parts = storagePath.split('/');
  if (parts.length !== 3 || parts[0] !== RECIPES_DIR) {
    throw new Error('Invalid storagePath format');
  }
  const [, userId, filename] = parts;
  const imageId = filename.replace(/\.jpg$/, '');
  if (!isValidPathComponent(userId) || !isValidPathComponent(imageId)) {
    throw new Error('Invalid storagePath: contains invalid characters');
  }

  const fullPath = getRecipeImagePath(storagePath);
  return fs.readFile(fullPath);
}

/**
 * Check if a recipe image exists in storage
 */
export async function recipeImageExists(storagePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(STORAGE_BASE, storagePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a recipe image from storage
 */
export async function deleteRecipeImage(storagePath: string): Promise<void> {
  // Validate storagePath doesn't contain path traversal
  if (storagePath.includes('..') || path.isAbsolute(storagePath)) {
    throw new Error('Invalid storagePath: path traversal detected');
  }

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
 * Delete all images for a user
 */
export async function deleteUserRecipeImages(userId: string): Promise<void> {
  validatePathComponent(userId, 'userId');

  const dir = path.join(STORAGE_BASE, RECIPES_DIR, userId);
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
 * Get the API URL for serving a recipe image
 */
export function getRecipeImageUrl(userId: string, imageId: string): string {
  return `/api/recipes/images/${userId}/${imageId}`;
}
