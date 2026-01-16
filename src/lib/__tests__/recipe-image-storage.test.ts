/**
 * Tests for recipe image storage module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockImageBuffer,
} from './fixtures/recipe-fixtures';

// Use vi.hoisted to ensure mocks are created before vi.mock runs
const { mockMkdir, mockWriteFile, mockReadFile, mockAccess, mockUnlink, mockRm } = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockWriteFile: vi.fn(),
  mockReadFile: vi.fn(),
  mockAccess: vi.fn(),
  mockUnlink: vi.fn(),
  mockRm: vi.fn(),
}));

// Mock fs/promises with default export
vi.mock('fs/promises', () => ({
  default: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
    unlink: mockUnlink,
    rm: mockRm,
  },
}));

// Import the module after mocking
import {
  isValidPathComponent,
  saveRecipeImage,
  readRecipeImage,
  recipeImageExists,
  deleteRecipeImage,
  deleteUserRecipeImages,
  getRecipeImageUrl,
  getRecipeImagePath,
} from '../recipe-image-storage';

describe('recipe-image-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock implementations
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(Buffer.from('test'));
    mockAccess.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
  });

  describe('isValidPathComponent', () => {
    describe('valid inputs', () => {
      it('accepts alphanumeric strings', () => {
        expect(isValidPathComponent('abc123')).toBe(true);
      });

      it('accepts strings with dashes', () => {
        expect(isValidPathComponent('test-image-123')).toBe(true);
      });

      it('accepts strings with underscores', () => {
        expect(isValidPathComponent('test_image_123')).toBe(true);
      });

      it('accepts mixed case letters', () => {
        expect(isValidPathComponent('TestImage123')).toBe(true);
      });

      it('accepts UUIDs', () => {
        expect(isValidPathComponent('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('accepts single characters', () => {
        expect(isValidPathComponent('a')).toBe(true);
        expect(isValidPathComponent('1')).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects path traversal with ..', () => {
        expect(isValidPathComponent('..')).toBe(false);
        expect(isValidPathComponent('../etc')).toBe(false);
        expect(isValidPathComponent('test/../secret')).toBe(false);
      });

      it('rejects absolute paths', () => {
        expect(isValidPathComponent('/etc/passwd')).toBe(false);
        expect(isValidPathComponent('/data/images')).toBe(false);
      });

      it('rejects paths with slashes', () => {
        expect(isValidPathComponent('path/to/file')).toBe(false);
      });

      it('rejects paths with special characters', () => {
        expect(isValidPathComponent('test@file')).toBe(false);
        expect(isValidPathComponent('test#file')).toBe(false);
        expect(isValidPathComponent('test$file')).toBe(false);
        expect(isValidPathComponent('test file')).toBe(false);
        expect(isValidPathComponent('test.jpg')).toBe(false);
      });

      it('rejects empty strings', () => {
        expect(isValidPathComponent('')).toBe(false);
      });

      it('rejects strings with dots', () => {
        expect(isValidPathComponent('file.ext')).toBe(false);
        expect(isValidPathComponent('.hidden')).toBe(false);
      });
    });
  });

  describe('saveRecipeImage', () => {
    it('creates directory and saves image', async () => {
      const buffer = createMockImageBuffer('jpeg');
      const result = await saveRecipeImage('user123', 'image456', buffer);

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.storagePath).toBe('recipes/user123/image456.jpg');
      expect(result.fileSizeBytes).toBe(buffer.length);
    });

    it('returns correct storage path format', async () => {
      const buffer = createMockImageBuffer('jpeg');
      const result = await saveRecipeImage('abc-123', 'def-456', buffer);

      expect(result.storagePath).toBe('recipes/abc-123/def-456.jpg');
    });

    it('throws error for invalid userId', async () => {
      const buffer = createMockImageBuffer('jpeg');
      await expect(saveRecipeImage('../etc', 'image123', buffer)).rejects.toThrow(
        'Invalid userId'
      );
    });

    it('throws error for invalid imageId', async () => {
      const buffer = createMockImageBuffer('jpeg');
      await expect(saveRecipeImage('user123', '../passwd', buffer)).rejects.toThrow(
        'Invalid imageId'
      );
    });

    it('throws error for userId with path traversal', async () => {
      const buffer = createMockImageBuffer('jpeg');
      await expect(saveRecipeImage('user/../admin', 'image123', buffer)).rejects.toThrow(
        'Invalid userId'
      );
    });

    it('handles mkdir failure if not EEXIST', async () => {
      const buffer = createMockImageBuffer('jpeg');
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      mockMkdir.mockRejectedValueOnce(error);

      await expect(saveRecipeImage('user123', 'image456', buffer)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('ignores EEXIST error for mkdir', async () => {
      const buffer = createMockImageBuffer('jpeg');
      const error = new Error('Directory exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      mockMkdir.mockRejectedValueOnce(error);

      const result = await saveRecipeImage('user123', 'image456', buffer);
      expect(result.storagePath).toBe('recipes/user123/image456.jpg');
    });
  });

  describe('readRecipeImage', () => {
    it('reads image from valid storage path', async () => {
      const imageBuffer = Buffer.from('image data');
      mockReadFile.mockResolvedValueOnce(imageBuffer);

      const result = await readRecipeImage('recipes/user123/image456.jpg');
      expect(result).toEqual(imageBuffer);
    });

    it('throws error for path traversal in storagePath', async () => {
      await expect(readRecipeImage('recipes/../etc/passwd')).rejects.toThrow(
        'path traversal detected'
      );
    });

    it('throws error for absolute paths', async () => {
      await expect(readRecipeImage('/etc/passwd')).rejects.toThrow(
        'path traversal detected'
      );
    });

    it('throws error for invalid storagePath format', async () => {
      await expect(readRecipeImage('invalid/path.jpg')).rejects.toThrow(
        'Invalid storagePath format'
      );
    });

    it('throws error for missing recipes prefix', async () => {
      await expect(readRecipeImage('other/user123/image456.jpg')).rejects.toThrow(
        'Invalid storagePath format'
      );
    });

    it('throws error for invalid userId in path', async () => {
      await expect(readRecipeImage('recipes/user@123/image456.jpg')).rejects.toThrow(
        'Invalid storagePath: contains invalid characters'
      );
    });

    it('throws error for invalid imageId in path', async () => {
      await expect(readRecipeImage('recipes/user123/image@456.jpg')).rejects.toThrow(
        'Invalid storagePath: contains invalid characters'
      );
    });
  });

  describe('recipeImageExists', () => {
    it('returns true when image exists', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      const exists = await recipeImageExists('recipes/user123/image456.jpg');
      expect(exists).toBe(true);
    });

    it('returns false when image does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      const exists = await recipeImageExists('recipes/user123/image456.jpg');
      expect(exists).toBe(false);
    });
  });

  describe('deleteRecipeImage', () => {
    it('deletes existing image', async () => {
      await deleteRecipeImage('recipes/user123/image456.jpg');
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('throws error for path traversal', async () => {
      await expect(deleteRecipeImage('../etc/passwd')).rejects.toThrow(
        'path traversal detected'
      );
    });

    it('throws error for absolute paths', async () => {
      await expect(deleteRecipeImage('/etc/passwd')).rejects.toThrow(
        'path traversal detected'
      );
    });

    it('silently handles ENOENT (file not found)', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockUnlink.mockRejectedValueOnce(error);

      // Should not throw
      await expect(deleteRecipeImage('recipes/user123/image456.jpg')).resolves.toBeUndefined();
    });

    it('throws other unlink errors', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      mockUnlink.mockRejectedValueOnce(error);

      await expect(deleteRecipeImage('recipes/user123/image456.jpg')).rejects.toThrow(
        'Permission denied'
      );
    });
  });

  describe('deleteUserRecipeImages', () => {
    it('removes user directory recursively', async () => {
      await deleteUserRecipeImages('user123');
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining('recipes/user123'),
        { recursive: true, force: true }
      );
    });

    it('throws error for invalid userId', async () => {
      await expect(deleteUserRecipeImages('../etc')).rejects.toThrow('Invalid userId');
    });

    it('silently handles ENOENT (directory not found)', async () => {
      const error = new Error('Directory not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockRm.mockRejectedValueOnce(error);

      await expect(deleteUserRecipeImages('user123')).resolves.toBeUndefined();
    });

    it('throws other rm errors', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      mockRm.mockRejectedValueOnce(error);

      await expect(deleteUserRecipeImages('user123')).rejects.toThrow('Permission denied');
    });
  });

  describe('getRecipeImageUrl', () => {
    it('returns correct API URL format', () => {
      const url = getRecipeImageUrl('user123', 'image456');
      expect(url).toBe('/api/recipes/images/user123/image456');
    });

    it('handles different userId and imageId values', () => {
      expect(getRecipeImageUrl('abc', 'def')).toBe('/api/recipes/images/abc/def');
      expect(getRecipeImageUrl('123', '456')).toBe('/api/recipes/images/123/456');
      expect(getRecipeImageUrl('user-1', 'img-2')).toBe('/api/recipes/images/user-1/img-2');
    });
  });

  describe('getRecipeImagePath', () => {
    it('joins storage base with storage path', () => {
      const path = getRecipeImagePath('recipes/user123/image456.jpg');
      expect(path).toContain('recipes/user123/image456.jpg');
    });
  });
});
