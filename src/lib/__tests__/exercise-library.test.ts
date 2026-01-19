/**
 * Tests for exercise library functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeExerciseName,
  getExercisesWithCompleteImages,
} from '../exercise-library';

// Mock database
vi.mock('../db', () => ({
  query: vi.fn(),
}));

import { query } from '../db';

describe('exercise-library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // normalizeExerciseName Tests
  // ============================================

  describe('normalizeExerciseName', () => {
    it('converts to lowercase', () => {
      expect(normalizeExerciseName('Push Up')).toBe('push-up');
      expect(normalizeExerciseName('BURPEES')).toBe('burpees');
    });

    it('replaces spaces with hyphens', () => {
      expect(normalizeExerciseName('jumping jacks')).toBe('jumping-jacks');
      expect(normalizeExerciseName('mountain  climbers')).toBe('mountain-climbers');
    });

    it('removes special characters', () => {
      expect(normalizeExerciseName('push-up (modified)')).toBe('push-up-modified');
      expect(normalizeExerciseName('90° leg raise')).toBe('90-leg-raise');
    });

    it('converts leading/trailing spaces to hyphens', () => {
      // .trim() is called after spaces are replaced with hyphens,
      // so leading/trailing spaces become leading/trailing hyphens
      expect(normalizeExerciseName('  squats  ')).toBe('-squats-');
    });

    it('handles multiple transformations', () => {
      // Leading/trailing spaces become hyphens after replace
      expect(normalizeExerciseName(' Push Up (Incline) ')).toBe('-push-up-incline-');
    });

    it('truncates names longer than 255 characters', () => {
      const longName = 'a'.repeat(300);
      const result = normalizeExerciseName(longName);
      expect(result.length).toBe(255);
    });

    it('does not truncate names at or under 255 characters', () => {
      const exactName = 'a'.repeat(255);
      const result = normalizeExerciseName(exactName);
      expect(result.length).toBe(255);
      expect(result).toBe(exactName);
    });
  });

  // ============================================
  // getExercisesWithCompleteImages Tests
  // ============================================

  describe('getExercisesWithCompleteImages', () => {
    it('returns empty Set for empty input array', async () => {
      const result = await getExercisesWithCompleteImages([]);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
      expect(query).not.toHaveBeenCalled();
    });

    it('queries database with normalized exercise names', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { normalized_name: 'push-up' },
          { normalized_name: 'squats' },
        ],
        rowCount: 2,
      });

      await getExercisesWithCompleteImages(['Push Up', 'Squats', 'Burpees']);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT e.normalized_name'),
        [['push-up', 'squats', 'burpees']]
      );
    });

    it('returns Set of normalized names with complete images', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { normalized_name: 'push-up' },
          { normalized_name: 'mountain-climbers' },
        ],
        rowCount: 2,
      });

      const result = await getExercisesWithCompleteImages([
        'Push Up',
        'Mountain Climbers',
        'Burpees',
      ]);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has('push-up')).toBe(true);
      expect(result.has('mountain-climbers')).toBe(true);
      expect(result.has('burpees')).toBe(false);
    });

    it('returns empty Set when no exercises have complete images', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await getExercisesWithCompleteImages(['Push Up', 'Squats']);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('handles duplicate exercise names', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ normalized_name: 'push-up' }],
        rowCount: 1,
      });

      const result = await getExercisesWithCompleteImages([
        'Push Up',
        'push up',
        'PUSH UP',
      ]);

      // All should normalize to the same name
      expect(result.has('push-up')).toBe(true);
    });

    it('handles exercises with special characters', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ normalized_name: 'push-up-modified' }],
        rowCount: 1,
      });

      const result = await getExercisesWithCompleteImages([
        'Push Up (Modified)',
      ]);

      expect(result.has('push-up-modified')).toBe(true);
    });
  });
});
