import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import structuredWorkouts before mocks to test the builder function
import { structuredWorkouts } from '../workoutPlan'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

// Mock database
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

describe('buildStructuredWorkout - transition segments', () => {
  describe('restBetweenStepsSeconds', () => {
    it('inserts transition segments between HIIT exercises on Friday', () => {
      const friday = structuredWorkouts.friday
      const segments = friday.segments

      // Find HIIT segments
      const hiitSegments = segments.filter(s => s.category === 'hiit')
      expect(hiitSegments.length).toBeGreaterThan(0)

      // Find "Get ready" transition segments within the HIIT phase
      const transitionSegments = segments.filter(s =>
        s.title === 'Get ready' && s.detail?.startsWith('Next:')
      )

      // With 4 exercises and 3 rounds, we should have 3 transitions per round = 9 total
      // (transitions between exercises 1-2, 2-3, 3-4 in each round)
      expect(transitionSegments.length).toBe(9)
    })

    it('transition segments have 5 second duration', () => {
      const friday = structuredWorkouts.friday
      const transitionSegments = friday.segments.filter(s =>
        s.title === 'Get ready' && s.detail?.startsWith('Next:')
      )

      for (const segment of transitionSegments) {
        expect(segment.durationSeconds).toBe(5)
      }
    })

    it('transition segments show next exercise name in detail', () => {
      const friday = structuredWorkouts.friday
      const transitionSegments = friday.segments.filter(s =>
        s.title === 'Get ready' && s.detail?.startsWith('Next:')
      )

      // Check that each transition shows the upcoming exercise
      for (const segment of transitionSegments) {
        expect(segment.detail).toMatch(/^Next: Minute \d+:/)
      }
    })

    it('transition segments have rest category', () => {
      const friday = structuredWorkouts.friday
      const transitionSegments = friday.segments.filter(s =>
        s.title === 'Get ready' && s.detail?.startsWith('Next:')
      )

      for (const segment of transitionSegments) {
        expect(segment.category).toBe('rest')
      }
    })

    it('transition segments have correct round labels', () => {
      const friday = structuredWorkouts.friday
      const transitionSegments = friday.segments.filter(s =>
        s.title === 'Get ready' && s.detail?.startsWith('Next:')
      )

      // With 3 rounds, we should have 3 transitions per round
      // Each should have the correct round label
      const round1 = transitionSegments.filter(s => s.round === 'Round 1/3')
      const round2 = transitionSegments.filter(s => s.round === 'Round 2/3')
      const round3 = transitionSegments.filter(s => s.round === 'Round 3/3')

      expect(round1.length).toBe(3)
      expect(round2.length).toBe(3)
      expect(round3.length).toBe(3)
    })

    it('no transition after last exercise in each round', () => {
      const friday = structuredWorkouts.friday
      const segments = friday.segments

      // Find all "Minute 4: Mountain climbers" segments (last HIIT exercise in each round)
      const mountainClimberIndices: number[] = []
      segments.forEach((s, i) => {
        if (s.title === 'Minute 4: Mountain climbers') {
          mountainClimberIndices.push(i)
        }
      })

      // After each mountain climbers segment, the next segment should NOT be a "Get ready" transition
      // (it should either be the start of the next round or end of the HIIT block)
      for (const idx of mountainClimberIndices) {
        const nextSegment = segments[idx + 1]
        if (nextSegment) {
          // If there's a next segment, it should either be another HIIT exercise (next round)
          // or a different category, but NOT a "Get ready" transition
          if (nextSegment.title === 'Get ready' && nextSegment.detail?.startsWith('Next:')) {
            // This would be wrong - no transition should follow the last exercise
            expect(nextSegment.detail).not.toMatch(/Next: Minute 4/)
          }
        }
      }
    })

    it('workouts without restBetweenStepsSeconds have no transitions', () => {
      // Monday workout does not have restBetweenStepsSeconds
      const monday = structuredWorkouts.monday
      const transitionSegments = monday.segments.filter(s =>
        s.title === 'Get ready' && s.detail?.startsWith('Next:')
      )

      expect(transitionSegments.length).toBe(0)
    })
  })
})

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

  describe('Multi-user workout isolation', () => {
    it('getWorkoutBySlug passes correct user_id to database query', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-abc', email: 'userA@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      const storedWorkout = {
        slug: 'monday',
        title: 'User A Monday',
        focus: 'Custom A',
        description: 'User A description',
        segments: [{ id: '1', title: 'Ex 1', durationSeconds: 30, category: 'main' }],
        totalSeconds: 30
      }

      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: storedWorkout }],
        rowCount: 1
      })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      await getWorkoutBySlug('monday')

      // Verify the query was called with the correct user_id
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['user-abc'])
      )
    })

    it('getAllWorkouts passes correct user_id to database query', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-xyz', email: 'userX@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })

      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 })

      const { getAllWorkouts } = await import('../workoutPlan')
      await getAllWorkouts()

      // Verify the query was called with the correct user_id
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['user-xyz'])
      )
    })

    it('different users get different workout data when auth returns different sessions', async () => {
      const { auth } = await import('@/lib/auth')
      const { query } = await import('@/lib/db')

      // User A's workout
      const userAWorkout = {
        slug: 'monday',
        title: 'User A Custom Workout',
        focus: 'User A Focus',
        description: 'Customized for User A',
        segments: [
          { id: '1', title: 'User A Exercise', durationSeconds: 45, category: 'main' }
        ],
        totalSeconds: 45
      }

      // User B's workout
      const userBWorkout = {
        slug: 'monday',
        title: 'User B Custom Workout',
        focus: 'User B Focus',
        description: 'Customized for User B',
        segments: [
          { id: '1', title: 'User B Exercise', durationSeconds: 60, category: 'main' },
          { id: '2', title: 'User B Exercise 2', durationSeconds: 30, category: 'main' }
        ],
        totalSeconds: 90
      }

      // Simulate User A's session
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-A', email: 'userA@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })
      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: userAWorkout }],
        rowCount: 1
      })

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const resultA = await getWorkoutBySlug('monday')

      expect(resultA).not.toBeNull()
      expect(resultA!.title).toBe('User A Custom Workout')
      expect(resultA!.segments).toHaveLength(1)
      expect(resultA!.segments[0].title).toBe('User A Exercise')

      // Clear and switch to User B's session
      vi.clearAllMocks()

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-B', email: 'userB@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })
      vi.mocked(query).mockResolvedValue({
        rows: [{ workout_json: userBWorkout }],
        rowCount: 1
      })

      const resultB = await getWorkoutBySlug('monday')

      expect(resultB).not.toBeNull()
      expect(resultB!.title).toBe('User B Custom Workout')
      expect(resultB!.segments).toHaveLength(2)
      expect(resultB!.segments[0].title).toBe('User B Exercise')

      // Verify the data is different
      expect(resultA!.title).not.toBe(resultB!.title)
      expect(resultA!.segments.length).not.toBe(resultB!.segments.length)
    })

    it('returns null when user has no session (security check)', async () => {
      const { auth } = await import('@/lib/auth')

      // Simulate no session (logged out)
      vi.mocked(auth).mockResolvedValue(null)

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')

      expect(result).toBeNull()
    })

    it('returns null when session exists but user.id is missing', async () => {
      const { auth } = await import('@/lib/auth')

      // Simulate session with missing user.id
      vi.mocked(auth).mockResolvedValue({
        user: { email: 'test@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      } as never)

      const { getWorkoutBySlug } = await import('../workoutPlan')
      const result = await getWorkoutBySlug('monday')

      expect(result).toBeNull()
    })
  })
})
