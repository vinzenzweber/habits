/**
 * Tests for exercise library functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeExerciseName,
  getExercisesWithCompleteImages,
  getExerciseDescriptions,
  updateExerciseDescription,
  getAllExercisesForManagement,
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

  // ============================================
  // getExerciseDescriptions Tests
  // ============================================

  describe('getExerciseDescriptions', () => {
    it('returns empty Map for empty input array', async () => {
      const result = await getExerciseDescriptions([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(query).not.toHaveBeenCalled();
    });

    it('queries database with normalized exercise names', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await getExerciseDescriptions(['Push-ups', 'Goblet squats']);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT name, form_cues'),
        [['push-ups', 'goblet-squats']]
      );
    });

    it('returns Map with exercise names and descriptions', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { name: 'Push-ups', form_cues: 'Hands under shoulders, body straight, lower chest, press up.' },
          { name: 'Goblet squats', form_cues: 'Hold bell at chest, squat deep, drive up.' },
        ],
        rowCount: 2,
      });

      const result = await getExerciseDescriptions(['Push-ups', 'Goblet squats', 'Unknown Exercise']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('Push-ups')).toBe('Hands under shoulders, body straight, lower chest, press up.');
      expect(result.get('Goblet squats')).toBe('Hold bell at chest, squat deep, drive up.');
      expect(result.has('Unknown Exercise')).toBe(false);
    });

    it('returns empty Map when no exercises found in database', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await getExerciseDescriptions(['Push-ups', 'Squats']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('only includes exercises with non-null form_cues', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { name: 'Push-ups', form_cues: 'Description for push-ups.' },
          // Note: form_cues IS NOT NULL is in the query, so this won't be returned by DB
        ],
        rowCount: 1,
      });

      const result = await getExerciseDescriptions(['Push-ups', 'No Description Exercise']);

      expect(result.size).toBe(1);
      expect(result.get('Push-ups')).toBe('Description for push-ups.');
    });

    it('handles exercises with special characters in names', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { name: 'Arm circles (forward/back)', form_cues: 'Arms straight, small to big circles both ways.' },
        ],
        rowCount: 1,
      });

      const result = await getExerciseDescriptions(['Arm circles (forward/back)']);

      expect(result.size).toBe(1);
      expect(result.get('Arm circles (forward/back)')).toBe('Arms straight, small to big circles both ways.');
    });
  });

  // ============================================
  // updateExerciseDescription Tests
  // ============================================

  describe('updateExerciseDescription', () => {
    it('updates exercise description and returns updated exercise', async () => {
      const mockUpdatedRow = {
        id: 1,
        name: 'Push-ups',
        normalized_name: 'push-ups',
        description: null,
        form_cues: 'Updated description for push-ups.',
        muscle_groups: ['chest', 'triceps'],
        equipment: [],
        category: 'main',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockUpdatedRow],
        rowCount: 1,
      });

      const result = await updateExerciseDescription(1, 'Updated description for push-ups.');

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exercises'),
        ['Updated description for push-ups.', 1]
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Push-ups');
      expect(result?.formCues).toBe('Updated description for push-ups.');
    });

    it('returns null when exercise not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await updateExerciseDescription(999, 'Some description');

      expect(result).toBeNull();
    });

    it('updates with empty string to clear description', async () => {
      const mockUpdatedRow = {
        id: 1,
        name: 'Push-ups',
        normalized_name: 'push-ups',
        description: null,
        form_cues: '',
        muscle_groups: [],
        equipment: [],
        category: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockUpdatedRow],
        rowCount: 1,
      });

      const result = await updateExerciseDescription(1, '');

      expect(result?.formCues).toBe('');
    });

    it('handles null muscle_groups and equipment arrays', async () => {
      const mockUpdatedRow = {
        id: 1,
        name: 'New Exercise',
        normalized_name: 'new-exercise',
        description: null,
        form_cues: 'A description',
        muscle_groups: null,
        equipment: null,
        category: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockUpdatedRow],
        rowCount: 1,
      });

      const result = await updateExerciseDescription(1, 'A description');

      expect(result?.muscleGroups).toEqual([]);
      expect(result?.equipment).toEqual([]);
    });
  });

  // ============================================
  // getAllExercisesForManagement Tests
  // ============================================

  describe('getAllExercisesForManagement', () => {
    it('returns all exercises sorted by name', async () => {
      const mockRows = [
        {
          id: 1,
          name: 'Burpees',
          form_cues: 'Jump, plank, push-up, repeat.',
          category: 'hiit',
          updated_at: new Date('2024-01-10'),
        },
        {
          id: 2,
          name: 'Push-ups',
          form_cues: 'Hands under shoulders, lower chest.',
          category: 'main',
          updated_at: new Date('2024-01-15'),
        },
        {
          id: 3,
          name: 'Squats',
          form_cues: null,
          category: 'main',
          updated_at: new Date('2024-01-05'),
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 3,
      });

      const result = await getAllExercisesForManagement();

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, form_cues, category, updated_at')
      );
      expect(result).toHaveLength(3);
    });

    it('correctly identifies exercises with descriptions', async () => {
      const mockRows = [
        {
          id: 1,
          name: 'Push-ups',
          form_cues: 'Hands under shoulders.',
          category: 'main',
          updated_at: new Date(),
        },
        {
          id: 2,
          name: 'Squats',
          form_cues: null,
          category: 'main',
          updated_at: new Date(),
        },
        {
          id: 3,
          name: 'Empty Description',
          form_cues: '   ',
          category: 'main',
          updated_at: new Date(),
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 3,
      });

      const result = await getAllExercisesForManagement();

      expect(result[0].hasDescription).toBe(true);  // Has description
      expect(result[1].hasDescription).toBe(false); // null
      expect(result[2].hasDescription).toBe(false); // Whitespace only - no meaningful content
    });

    it('returns empty array when no exercises exist', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await getAllExercisesForManagement();

      expect(result).toEqual([]);
    });

    it('includes all required fields in result', async () => {
      const mockRow = {
        id: 42,
        name: 'Test Exercise',
        form_cues: 'Test description.',
        category: 'warmup',
        updated_at: new Date('2024-06-15'),
      };

      vi.mocked(query).mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      });

      const result = await getAllExercisesForManagement();

      expect(result[0]).toEqual({
        id: 42,
        name: 'Test Exercise',
        formCues: 'Test description.',
        hasDescription: true,
        category: 'warmup',
        updatedAt: new Date('2024-06-15'),
      });
    });
  });
});
