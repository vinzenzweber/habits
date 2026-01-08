import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

// Mock database
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

describe('workoutPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getWorkoutBySlug', () => {
    it('returns null for null slug', async () => {
      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug(null)
      expect(result).toBeNull()
    })

    it('returns null for invalid slug', async () => {
      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('invalid-day')
      expect(result).toBeNull()
    })

    it('returns null when not authenticated', async () => {
      const { auth } = await import('@/lib/auth')
      vi.mocked(auth).mockResolvedValue(null)

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')
      expect(result).toBeNull()
    })

    it('returns null when workout not found in database', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')
      expect(result).toBeNull()
    })

    it('recalculates totalSeconds from segments', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      // Simulate a workout with incorrect totalSeconds stored in DB
      const storedWorkout = {
        slug: 'monday',
        title: 'Test Workout',
        focus: 'Testing',
        description: 'A test workout',
        segments: [
          { id: '1', title: 'Exercise 1', durationSeconds: 30, category: 'warmup' },
          { id: '2', title: 'Exercise 2', durationSeconds: 45, category: 'main' },
          { id: '3', title: 'Exercise 3', durationSeconds: 60, category: 'main' },
        ],
        totalSeconds: 999 // Intentionally wrong value
      }

      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: storedWorkout }],
        rowCount: 1
      })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')

      expect(result).not.toBeNull()
      // Should be recalculated: 30 + 45 + 60 = 135
      expect(result!.totalSeconds).toBe(135)
      // Should NOT be the incorrect stored value
      expect(result!.totalSeconds).not.toBe(999)
    })

    it('handles workouts with missing durationSeconds gracefully', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      const storedWorkout = {
        slug: 'monday',
        title: 'Test Workout',
        focus: 'Testing',
        description: 'A test workout',
        segments: [
          { id: '1', title: 'Exercise 1', durationSeconds: 30, category: 'warmup' },
          { id: '2', title: 'Exercise 2', category: 'main' }, // Missing durationSeconds
          { id: '3', title: 'Exercise 3', durationSeconds: 60, category: 'main' },
        ],
        totalSeconds: 100
      }

      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: storedWorkout }],
        rowCount: 1
      })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')

      expect(result).not.toBeNull()
      // Should handle missing durationSeconds as 0: 30 + 0 + 60 = 90
      expect(result!.totalSeconds).toBe(90)
    })

    it('handles workouts with empty segments array', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      const storedWorkout = {
        slug: 'monday',
        title: 'Empty Workout',
        focus: 'Testing',
        description: 'A workout with no segments',
        segments: [],
        totalSeconds: 500
      }

      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: storedWorkout }],
        rowCount: 1
      })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')

      expect(result).not.toBeNull()
      expect(result!.totalSeconds).toBe(0)
    })

    it('adds day label to workout', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      const storedWorkout = {
        slug: 'wednesday',
        title: 'Test Workout',
        focus: 'Testing',
        description: 'A test workout',
        segments: [
          { id: '1', title: 'Exercise 1', durationSeconds: 30, category: 'main' }
        ],
        totalSeconds: 30
      }

      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: storedWorkout }],
        rowCount: 1
      })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('wednesday')

      expect(result).not.toBeNull()
      expect(result!.label).toBe('Wednesday')
    })
  })

  describe('getAllWorkouts', () => {
    it('returns empty array when not authenticated', async () => {
      const { auth } = await import('@/lib/auth')
      vi.mocked(auth).mockResolvedValue(null)

      const { getAllWorkouts } = await import('../workoutPlan')
      const result = await getAllWorkouts()
      expect(result).toEqual([])
    })

    it('returns empty array when no workouts found', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 })

      const { getAllWorkouts } = await import('../workoutPlan')
      const result = await getAllWorkouts()
      expect(result).toEqual([])
    })

    it('recalculates totalSeconds for all workouts', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      const storedWorkouts = [
        {
          slug: 'monday',
          title: 'Monday Workout',
          focus: 'Strength',
          description: 'Monday training',
          segments: [
            { id: '1', title: 'Ex 1', durationSeconds: 30, category: 'main' },
            { id: '2', title: 'Ex 2', durationSeconds: 45, category: 'main' },
          ],
          totalSeconds: 1000 // Wrong
        },
        {
          slug: 'tuesday',
          title: 'Tuesday Workout',
          focus: 'Cardio',
          description: 'Tuesday training',
          segments: [
            { id: '1', title: 'Ex 1', durationSeconds: 60, category: 'main' },
            { id: '2', title: 'Ex 2', durationSeconds: 60, category: 'main' },
            { id: '3', title: 'Ex 3', durationSeconds: 30, category: 'main' },
          ],
          totalSeconds: 2000 // Wrong
        }
      ]

      vi.mocked(query).mockResolvedValue({
        rows: storedWorkouts.map(w => ({ workout_json: w })),
        rowCount: 2
      })

      const { getAllWorkouts } = await import('../workoutPlan')
      const result = await getAllWorkouts()

      expect(result).toHaveLength(2)
      // Monday: 30 + 45 = 75
      expect(result[0].totalSeconds).toBe(75)
      expect(result[0].totalSeconds).not.toBe(1000)
      // Tuesday: 60 + 60 + 30 = 150
      expect(result[1].totalSeconds).toBe(150)
      expect(result[1].totalSeconds).not.toBe(2000)
    })

    it('adds labels to all workouts', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      const storedWorkouts = [
        {
          slug: 'friday',
          title: 'Friday Workout',
          focus: 'Fun',
          description: 'Friday training',
          segments: [{ id: '1', title: 'Ex', durationSeconds: 30, category: 'main' }],
          totalSeconds: 30
        },
        {
          slug: 'saturday',
          title: 'Saturday Workout',
          focus: 'Recovery',
          description: 'Saturday training',
          segments: [{ id: '1', title: 'Ex', durationSeconds: 20, category: 'main' }],
          totalSeconds: 20
        }
      ]

      vi.mocked(query).mockResolvedValue({
        rows: storedWorkouts.map(w => ({ workout_json: w })),
        rowCount: 2
      })

      const { getAllWorkouts } = await import('../workoutPlan')
      const result = await getAllWorkouts()

      expect(result[0].label).toBe('Friday')
      expect(result[1].label).toBe('Saturday')
    })
  })
})
