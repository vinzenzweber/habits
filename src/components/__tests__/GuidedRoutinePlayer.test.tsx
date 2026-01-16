/**
 * Tests for GuidedRoutinePlayer countdown beeps functionality
 */

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GuidedRoutinePlayer } from '../GuidedRoutinePlayer';
import type { WorkoutDay, RoutineSegment } from '@/lib/workoutPlan';

// Mock the ChatContext
vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({
    openChat: vi.fn(),
  }),
}));

// Mock the ExerciseImages components
vi.mock('../ExerciseImages', () => ({
  ExerciseImages: () => <div data-testid="exercise-images" />,
  ExerciseImageThumbnail: () => <div data-testid="exercise-thumbnail" />,
}));

// Mock the Confetti component
vi.mock('../Confetti', () => ({
  Confetti: () => null,
}));

// Mock Audio API
let mockPlay: ReturnType<typeof vi.fn>;
let mockPause: ReturnType<typeof vi.fn>;
let mockAudioInstance: {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  preload: string;
};
let audioConstructorCalled = false;
let audioConstructorArg = '';

// Mock Audio constructor as a class
class MockAudio {
  play = vi.fn();
  pause = vi.fn();
  currentTime = 0;
  preload = '';

  constructor(src?: string) {
    mockPlay = this.play;
    mockPause = this.pause;
    mockAudioInstance = this;
    audioConstructorCalled = true;
    audioConstructorArg = src || '';
  }
}

beforeEach(() => {
  mockPlay = vi.fn();
  mockPause = vi.fn();
  mockAudioInstance = {
    play: mockPlay,
    pause: mockPause,
    currentTime: 0,
    preload: '',
  };
  audioConstructorCalled = false;
  audioConstructorArg = '';

  global.Audio = MockAudio as unknown as typeof Audio;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const createMockSegments = (count: number = 2): RoutineSegment[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `segment-${i + 1}`,
    title: `Exercise ${i + 1}`,
    detail: 'Do the exercise',
    durationSeconds: 10,
    category: 'main' as const,
  }));

const createMockWorkout = (segments: RoutineSegment[]): WorkoutDay => ({
  slug: 'monday',
  label: 'Monday',
  title: 'Test Workout',
  focus: 'Full Body',
  description: 'A test workout',
  segments,
  totalSeconds: segments.reduce((total, s) => total + s.durationSeconds, 0),
});

describe('GuidedRoutinePlayer countdown beeps', () => {
  describe('audio initialization', () => {
    it('creates Audio instance on mount', () => {
      vi.useFakeTimers();
      const workout = createMockWorkout(createMockSegments());

      render(<GuidedRoutinePlayer workout={workout} />);

      expect(audioConstructorCalled).toBe(true);
      expect(audioConstructorArg).toBe('/short-beep-countdown-81121.mp3');
    });

    it('sets audio preload to auto', () => {
      vi.useFakeTimers();
      const workout = createMockWorkout(createMockSegments());

      render(<GuidedRoutinePlayer workout={workout} />);

      expect(mockAudioInstance.preload).toBe('auto');
    });
  });

  describe('beep playback', () => {
    it('plays beep at 4 seconds remaining', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Advance to 4 seconds remaining (10 - 6 = 4)
      act(() => {
        vi.advanceTimersByTime(6000); // 6 seconds = 24 intervals of 250ms
      });

      expect(mockPlay).toHaveBeenCalled();
    });

    it('plays beep at 3 seconds remaining', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Advance to 3 seconds remaining
      act(() => {
        vi.advanceTimersByTime(7000);
      });

      // Should have played for 4s and 3s
      expect(mockPlay).toHaveBeenCalled();
    });

    it('plays beep at 2 seconds remaining', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Advance to 2 seconds remaining
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(mockPlay).toHaveBeenCalled();
    });

    it('plays beep at 1 second remaining', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Advance to 1 second remaining
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      expect(mockPlay).toHaveBeenCalled();
    });

    it('does not play duplicate beeps for same second', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Advance into countdown zone
      act(() => {
        vi.advanceTimersByTime(6000); // At 4 seconds
      });

      const initialCallCount = mockPlay.mock.calls.length;

      // Advance a tiny bit more but still at 4 seconds
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Should not play again for the same second
      expect(mockPlay.mock.calls.length).toBe(initialCallCount);
    });

    it('resets beep tracking when seconds remaining > 4', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Advance to first beep (at 4 seconds remaining = 6 seconds elapsed)
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      const firstBeepCount = mockPlay.mock.calls.length;
      expect(firstBeepCount).toBeGreaterThan(0);

      // Continue advancing - beeps should continue for 3, 2, 1 seconds
      act(() => {
        vi.advanceTimersByTime(3000); // Another 3 seconds
      });

      // Should have more beeps now
      expect(mockPlay.mock.calls.length).toBeGreaterThan(firstBeepCount);
    });
  });

  describe('pause behavior', () => {
    it('pauses audio when timer is paused', () => {
      vi.useFakeTimers();
      const workout = createMockWorkout(createMockSegments());

      const { getByRole } = render(<GuidedRoutinePlayer workout={workout} />);

      // Get into countdown zone
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // Pause the timer
      const pauseButton = getByRole('button', { name: /pause/i });
      act(() => {
        pauseButton.click();
      });

      expect(mockPause).toHaveBeenCalled();
    });
  });

  describe('workout completion', () => {
    it('pauses and resets audio on workout finish', () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 2;
      const workout = createMockWorkout(segments);

      // Mock fetch for completion tracking
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ completionId: 1 }),
      });

      render(<GuidedRoutinePlayer workout={workout} />);

      // Complete the workout
      act(() => {
        vi.advanceTimersByTime(3000); // More than segment duration
      });

      expect(mockPause).toHaveBeenCalled();
      expect(mockAudioInstance.currentTime).toBe(0);
    });
  });

  describe('no segments', () => {
    it('does not crash with empty segments', () => {
      vi.useFakeTimers();
      const workout: WorkoutDay = {
        slug: 'empty',
        label: 'Empty',
        title: 'Empty Workout',
        focus: '',
        description: '',
        segments: [],
        totalSeconds: 0,
      };

      const { getByText } = render(<GuidedRoutinePlayer workout={workout} />);

      expect(getByText(/no guided plan available/i)).toBeInTheDocument();
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });
});
