import { describe, it, expect } from 'vitest'
import { validateWorkoutStructure, type WorkoutInput } from '../workout-tools'

describe('validateWorkoutStructure', () => {
  describe('phase order validation', () => {
    it('returns no warnings for correct phase order', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Get Ready', durationSeconds: 10, category: 'prep' },
          { id: '2', title: 'Arm Circles', durationSeconds: 30, category: 'warmup' },
          { id: '3', title: 'Squats', durationSeconds: 45, category: 'main', round: 'Round 1 of 3' },
          { id: '4', title: 'Squats', durationSeconds: 45, category: 'main', round: 'Round 2 of 3' },
          { id: '5', title: 'Squats', durationSeconds: 45, category: 'main', round: 'Round 3 of 3' },
          { id: '6', title: 'Stretch', durationSeconds: 60, category: 'recovery' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.filter(w => w.type === 'phase_order')).toHaveLength(0)
    })

    it('warns when warmup comes after main', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Squats', durationSeconds: 45, category: 'main' },
          { id: '2', title: 'Arm Circles', durationSeconds: 30, category: 'warmup' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.some(w => w.type === 'phase_order')).toBe(true)
    })

    it('warns when prep comes after warmup', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Arm Circles', durationSeconds: 30, category: 'warmup' },
          { id: '2', title: 'Get Ready', durationSeconds: 10, category: 'prep' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.some(w => w.type === 'phase_order')).toBe(true)
    })

    it('allows rest segments anywhere without warning', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Get Ready', durationSeconds: 10, category: 'prep' },
          { id: '2', title: 'Rest', durationSeconds: 30, category: 'rest' },
          { id: '3', title: 'Arm Circles', durationSeconds: 30, category: 'warmup' },
          { id: '4', title: 'Rest', durationSeconds: 30, category: 'rest' },
          { id: '5', title: 'Squats', durationSeconds: 45, category: 'main' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.filter(w => w.type === 'phase_order')).toHaveLength(0)
    })
  })

  describe('round validation', () => {
    it('returns no warnings when exercises have round indicators', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Squats', durationSeconds: 45, category: 'main', round: 'Round 1 of 3' },
          { id: '2', title: 'Push-ups', durationSeconds: 45, category: 'main', round: 'Round 1 of 3' },
          { id: '3', title: 'Squats', durationSeconds: 45, category: 'main', round: 'Round 2 of 3' },
          { id: '4', title: 'Push-ups', durationSeconds: 45, category: 'main', round: 'Round 2 of 3' },
          { id: '5', title: 'Squats', durationSeconds: 45, category: 'main', round: 'Round 3 of 3' },
          { id: '6', title: 'Push-ups', durationSeconds: 45, category: 'main', round: 'Round 3 of 3' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.filter(w => w.type === 'missing_rounds')).toHaveLength(0)
    })

    it('warns when multiple main exercises appear only once without rounds', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Squats', durationSeconds: 45, category: 'main' },
          { id: '2', title: 'Push-ups', durationSeconds: 45, category: 'main' },
          { id: '3', title: 'Lunges', durationSeconds: 45, category: 'main' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.some(w => w.type === 'missing_rounds')).toBe(true)
    })

    it('does not warn for single exercise repeated', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Squats', durationSeconds: 45, category: 'main' },
          { id: '2', title: 'Squats', durationSeconds: 45, category: 'main' },
          { id: '3', title: 'Squats', durationSeconds: 45, category: 'main' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.filter(w => w.type === 'missing_rounds')).toHaveLength(0)
    })
  })

  describe('rest period validation', () => {
    it('returns no warnings when rest periods exist between rounds', () => {
      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments: [
          { id: '1', title: 'Squats', durationSeconds: 45, category: 'main' },
          { id: '2', title: 'Push-ups', durationSeconds: 45, category: 'main' },
          { id: '3', title: 'Lunges', durationSeconds: 45, category: 'main' },
          { id: '4', title: 'Rest', durationSeconds: 30, category: 'rest' },
          { id: '5', title: 'Squats', durationSeconds: 45, category: 'main' },
          { id: '6', title: 'Push-ups', durationSeconds: 45, category: 'main' },
          { id: '7', title: 'Lunges', durationSeconds: 45, category: 'main' },
        ]
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.filter(w => w.type === 'missing_rest')).toHaveLength(0)
    })

    it('warns when too many consecutive main exercises without rest', () => {
      // Create 10 consecutive main exercises without rest
      const segments = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        title: `Exercise ${i + 1}`,
        durationSeconds: 45,
        category: 'main' as const
      }))

      const workout: WorkoutInput = {
        title: 'Test Workout',
        segments
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings.some(w => w.type === 'missing_rest')).toBe(true)
    })
  })

  describe('empty workouts', () => {
    it('returns no warnings for empty segments', () => {
      const workout: WorkoutInput = {
        title: 'Empty Workout',
        segments: []
      }

      const warnings = validateWorkoutStructure(workout)
      expect(warnings).toHaveLength(0)
    })
  })
})
