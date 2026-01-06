import { describe, it, expect } from 'vitest'

// Helper functions from GuidedRoutinePlayer that we want to test
// We extract and test the pure functions

function formatTime(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(clamped / 60)
  const remainingSeconds = clamped % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

interface RoutineSegment {
  durationSeconds: number
}

function sumDuration(segments: RoutineSegment[], endIndex: number): number {
  return segments.slice(0, endIndex).reduce((total, segment) => {
    return total + segment.durationSeconds
  }, 0)
}

describe('Timer Utilities', () => {
  describe('formatTime', () => {
    it('formats zero seconds as 0:00', () => {
      expect(formatTime(0)).toBe('0:00')
    })

    it('formats seconds under a minute correctly', () => {
      expect(formatTime(5)).toBe('0:05')
      expect(formatTime(30)).toBe('0:30')
      expect(formatTime(59)).toBe('0:59')
    })

    it('formats minutes and seconds correctly', () => {
      expect(formatTime(60)).toBe('1:00')
      expect(formatTime(61)).toBe('1:01')
      expect(formatTime(90)).toBe('1:30')
      expect(formatTime(125)).toBe('2:05')
    })

    it('handles large values', () => {
      expect(formatTime(600)).toBe('10:00')
      expect(formatTime(3599)).toBe('59:59')
      expect(formatTime(3600)).toBe('60:00')
    })

    it('handles negative values by clamping to zero', () => {
      expect(formatTime(-1)).toBe('0:00')
      expect(formatTime(-60)).toBe('0:00')
    })

    it('rounds up fractional seconds', () => {
      expect(formatTime(0.1)).toBe('0:01')
      expect(formatTime(0.9)).toBe('0:01')
      expect(formatTime(59.1)).toBe('1:00')
      expect(formatTime(59.9)).toBe('1:00')
    })

    it('pads single digit seconds with leading zero', () => {
      expect(formatTime(1)).toBe('0:01')
      expect(formatTime(9)).toBe('0:09')
      expect(formatTime(61)).toBe('1:01')
      expect(formatTime(69)).toBe('1:09')
    })
  })

  describe('sumDuration', () => {
    const testSegments: RoutineSegment[] = [
      { durationSeconds: 10 },
      { durationSeconds: 30 },
      { durationSeconds: 45 },
      { durationSeconds: 60 },
      { durationSeconds: 15 },
    ]

    it('returns 0 for endIndex 0', () => {
      expect(sumDuration(testSegments, 0)).toBe(0)
    })

    it('sums duration up to endIndex (exclusive)', () => {
      expect(sumDuration(testSegments, 1)).toBe(10)
      expect(sumDuration(testSegments, 2)).toBe(40) // 10 + 30
      expect(sumDuration(testSegments, 3)).toBe(85) // 10 + 30 + 45
      expect(sumDuration(testSegments, 4)).toBe(145) // 10 + 30 + 45 + 60
      expect(sumDuration(testSegments, 5)).toBe(160) // all segments
    })

    it('handles empty segment array', () => {
      expect(sumDuration([], 0)).toBe(0)
      expect(sumDuration([], 1)).toBe(0)
    })

    it('handles endIndex beyond array length', () => {
      expect(sumDuration(testSegments, 10)).toBe(160) // same as summing all
    })

    it('handles single segment', () => {
      const single: RoutineSegment[] = [{ durationSeconds: 30 }]
      expect(sumDuration(single, 0)).toBe(0)
      expect(sumDuration(single, 1)).toBe(30)
    })
  })
})
