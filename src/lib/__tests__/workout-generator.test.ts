import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock database query
vi.mock('@/lib/db', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
}))

// Test the pure functions by importing them after mocking
// Since the module has side effects (imports db), we need to mock first

describe('Workout Generator', () => {
  describe('getSplitType', () => {
    // We need to access the internal function
    // Since it's not exported, we'll test through the main function behavior

    it('uses full body split for 2-3 days per week', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'beginner',
        primaryGoal: 'general_fitness',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: ['bodyweight'],
        limitations: []
      })

      // Should have 7 days total (3 training + 4 rest)
      expect(workouts).toHaveLength(7)

      // Training days should be full body
      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))
      expect(trainingDays).toHaveLength(3)
      trainingDays.forEach(workout => {
        expect(workout.title).toContain('Full Body')
      })
    })

    it('uses upper/lower split for 4 days per week', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'intermediate',
        primaryGoal: 'strength',
        daysPerWeek: 4,
        minutesPerSession: 45,
        equipment: ['dumbbells'],
        limitations: []
      })

      expect(workouts).toHaveLength(7)

      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))
      expect(trainingDays).toHaveLength(4)

      // Should have mix of upper and lower
      const upperDays = trainingDays.filter(w => w.title.includes('Upper'))
      const lowerDays = trainingDays.filter(w => w.title.includes('Lower'))
      expect(upperDays.length).toBeGreaterThan(0)
      expect(lowerDays.length).toBeGreaterThan(0)
    })

    it('uses push/pull/legs split for 5+ days per week', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'advanced',
        primaryGoal: 'hypertrophy',
        daysPerWeek: 6,
        minutesPerSession: 60,
        equipment: ['kettlebells', 'pull-up bar'],
        limitations: []
      })

      expect(workouts).toHaveLength(7)

      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))
      expect(trainingDays).toHaveLength(6)

      // Should have push, pull, and leg days
      const pushDays = trainingDays.filter(w => w.title.includes('Push'))
      const pullDays = trainingDays.filter(w => w.title.includes('Pull'))
      const legDays = trainingDays.filter(w => w.title.includes('Leg'))
      expect(pushDays.length).toBeGreaterThan(0)
      expect(pullDays.length).toBeGreaterThan(0)
      expect(legDays.length).toBeGreaterThan(0)
    })
  })

  describe('filterExercises', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('includes bodyweight exercises when no equipment specified', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'beginner',
        primaryGoal: 'general_fitness',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: [],
        limitations: []
      })

      // Should still generate workouts with bodyweight exercises
      expect(workouts).toHaveLength(7)
      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))
      trainingDays.forEach(workout => {
        expect(workout.segments.length).toBeGreaterThan(0)
      })
    })

    it('filters out exercises that aggravate knee limitations', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'intermediate',
        primaryGoal: 'strength',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: ['bodyweight'],
        limitations: ['knee pain']
      })

      const allSegments = workouts.flatMap(w => w.segments)
      const mainSegments = allSegments.filter(s => s.category === 'main')

      // Should not include squat or lunge exercises
      mainSegments.forEach(segment => {
        expect(segment.title.toLowerCase()).not.toContain('squat')
        expect(segment.title.toLowerCase()).not.toContain('lunge')
        expect(segment.title.toLowerCase()).not.toContain('jump')
      })
    })

    it('filters out exercises that aggravate shoulder limitations', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'intermediate',
        primaryGoal: 'strength',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: ['bodyweight', 'dumbbells'],
        limitations: ['shoulder injury']
      })

      const allSegments = workouts.flatMap(w => w.segments)
      const mainSegments = allSegments.filter(s => s.category === 'main')

      // Should not include pressing or pull-up exercises
      mainSegments.forEach(segment => {
        expect(segment.title.toLowerCase()).not.toContain('press')
        expect(segment.title.toLowerCase()).not.toContain('pull-up')
      })
    })
  })

  describe('workout structure', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('includes prep, warmup, and main segments', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'beginner',
        primaryGoal: 'general_fitness',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: ['bodyweight'],
        limitations: []
      })

      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))

      trainingDays.forEach(workout => {
        const categories = [...new Set(workout.segments.map(s => s.category))]
        expect(categories).toContain('prep')
        expect(categories).toContain('warmup')
        expect(categories).toContain('main')
      })
    })

    it('calculates total seconds correctly', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'beginner',
        primaryGoal: 'general_fitness',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: ['bodyweight'],
        limitations: []
      })

      workouts.forEach(workout => {
        const calculatedTotal = workout.segments.reduce(
          (sum, s) => sum + s.durationSeconds,
          0
        )
        expect(workout.totalSeconds).toBe(calculatedTotal)
      })
    })

    it('includes HIIT exercises for fat loss goal', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'intermediate',
        primaryGoal: 'fat_loss',
        daysPerWeek: 3,
        minutesPerSession: 30,
        equipment: ['bodyweight'],
        limitations: []
      })

      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))

      // At least one training day should have HIIT exercises
      const hasHiit = trainingDays.some(workout =>
        workout.segments.some(s => s.category === 'hiit')
      )
      expect(hasHiit).toBe(true)
    })

    it('adds round indicators for multi-round workouts', async () => {
      const { generateWorkoutPlan } = await import('../workout-generator')
      const workouts = await generateWorkoutPlan('test-user', {
        experienceLevel: 'intermediate',
        primaryGoal: 'strength',
        daysPerWeek: 3,
        minutesPerSession: 45,
        equipment: ['bodyweight'],
        limitations: []
      })

      const trainingDays = workouts.filter(w => !w.title.includes('Rest'))

      // Intermediate users get 3 rounds, so should have round indicators
      trainingDays.forEach(workout => {
        const mainSegments = workout.segments.filter(s => s.category === 'main')
        const segmentsWithRounds = mainSegments.filter(s => s.round)
        expect(segmentsWithRounds.length).toBeGreaterThan(0)
      })
    })
  })
})
