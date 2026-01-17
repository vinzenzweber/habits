/**
 * Tests for GuidedRoutinePlayer countdown beeps functionality
 *
 * The component uses Web Audio API instead of HTMLAudioElement to play
 * countdown beeps without interrupting background music on mobile devices.
 */

import { render, act, waitFor } from '@testing-library/react';
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

// Mock Web Audio API
let mockStart: ReturnType<typeof vi.fn>;
let mockConnect: ReturnType<typeof vi.fn>;
let mockResume: ReturnType<typeof vi.fn>;
let mockClose: ReturnType<typeof vi.fn>;
let mockCreateBufferSource: ReturnType<typeof vi.fn>;
let audioContextCreated = false;
let audioContextState = 'running';

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();

  constructor() {
    mockStart = this.start;
    mockConnect = this.connect;
  }
}

class MockAudioContext {
  state = audioContextState;
  destination = {};

  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  // Resolve immediately with a mock buffer
  decodeAudioData = vi.fn().mockResolvedValue({} as AudioBuffer);

  constructor() {
    mockResume = this.resume;
    mockClose = this.close;
    mockCreateBufferSource = this.createBufferSource;
    audioContextCreated = true;
    this.state = audioContextState;
  }
}

// Mock fetch for audio file loading - resolves immediately
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })
);

beforeEach(() => {
  mockStart = vi.fn();
  mockConnect = vi.fn();
  mockResume = vi.fn();
  mockClose = vi.fn();
  mockCreateBufferSource = vi.fn();
  audioContextCreated = false;
  audioContextState = 'running';

  global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  (global as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;
  global.fetch = mockFetch;
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
  describe('Web Audio API initialization', () => {
    it('creates AudioContext on mount', () => {
      vi.useFakeTimers();
      const workout = createMockWorkout(createMockSegments());

      render(<GuidedRoutinePlayer workout={workout} />);

      expect(audioContextCreated).toBe(true);
    });

    it('fetches the audio file', () => {
      vi.useFakeTimers();
      const workout = createMockWorkout(createMockSegments());

      render(<GuidedRoutinePlayer workout={workout} />);

      expect(mockFetch).toHaveBeenCalledWith('/short-beep-countdown-81121.mp3');
    });

    it('cleans up AudioContext on unmount', async () => {
      const workout = createMockWorkout(createMockSegments());

      const { unmount } = render(<GuidedRoutinePlayer workout={workout} />);

      // Wait for audio loading to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      unmount();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('beep playback', () => {
    it('plays beep at 4 seconds remaining', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      // Let async audio loading complete
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to 4 seconds remaining (10 - 6 = 4)
      act(() => {
        vi.advanceTimersByTime(6000); // 6 seconds = 24 intervals of 250ms
      });

      expect(mockCreateBufferSource).toHaveBeenCalled();
      expect(mockStart).toHaveBeenCalled();
    });

    it('plays beep at 3 seconds remaining', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to 3 seconds remaining
      act(() => {
        vi.advanceTimersByTime(7000);
      });

      // Should have played for 4s and 3s
      expect(mockCreateBufferSource).toHaveBeenCalled();
    });

    it('plays beep at 2 seconds remaining', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to 2 seconds remaining
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(mockCreateBufferSource).toHaveBeenCalled();
    });

    it('plays beep at 1 second remaining', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to 1 second remaining
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      expect(mockCreateBufferSource).toHaveBeenCalled();
    });

    it('does not play duplicate beeps for same second', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance into countdown zone
      act(() => {
        vi.advanceTimersByTime(6000); // At 4 seconds
      });

      const initialCallCount = mockCreateBufferSource.mock.calls.length;

      // Advance a tiny bit more but still at 4 seconds
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Should not play again for the same second
      expect(mockCreateBufferSource.mock.calls.length).toBe(initialCallCount);
    });

    it('plays beeps in sequence during countdown', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to 4 seconds remaining - first beep
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(mockCreateBufferSource.mock.calls.length).toBe(1);

      // Advance to 3 seconds remaining - second beep
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockCreateBufferSource.mock.calls.length).toBe(2);

      // Advance to 2 seconds remaining - third beep
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockCreateBufferSource.mock.calls.length).toBe(3);

      // Advance to 1 second remaining - fourth beep
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockCreateBufferSource.mock.calls.length).toBe(4);
    });
  });

  describe('iOS AudioContext suspension handling', () => {
    it('resumes AudioContext if suspended before playing', async () => {
      vi.useFakeTimers();
      audioContextState = 'suspended';
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to trigger a beep
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // Should have called resume on the suspended context
      expect(mockResume).toHaveBeenCalled();
    });
  });

  describe('pause behavior', () => {
    it('does not play new beeps when timer is paused', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 10;
      const workout = createMockWorkout(segments);

      const { getByRole } = render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance to trigger the first beep (4s remaining)
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      const callCountAfterFirstBeep = mockCreateBufferSource.mock.calls.length;
      expect(callCountAfterFirstBeep).toBe(1);

      // Pause the timer
      const pauseButton = getByRole('button', { name: /pause/i });
      act(() => {
        pauseButton.click();
      });

      // Try to advance time (but timer is paused)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // No new beeps should have played since timer is paused
      expect(mockCreateBufferSource.mock.calls.length).toBe(callCountAfterFirstBeep);
    });
  });

  describe('workout completion', () => {
    it('does not play beeps after workout finishes', async () => {
      vi.useFakeTimers();
      const segments = createMockSegments(1);
      segments[0].durationSeconds = 5;
      const workout = createMockWorkout(segments);

      // Mock fetch for completion tracking
      global.fetch = vi.fn()
        .mockImplementationOnce(() => Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        }))
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ completionId: 1 }),
        }));

      render(<GuidedRoutinePlayer workout={workout} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Complete the workout (5 second segment = beeps at 4, 3, 2, 1 = 4 beeps)
      act(() => {
        vi.advanceTimersByTime(6000); // More than segment duration
      });

      const callCountAtFinish = mockCreateBufferSource.mock.calls.length;

      // Advance more time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // No new beeps should play after completion
      expect(mockCreateBufferSource.mock.calls.length).toBe(callCountAtFinish);
    });
  });

  describe('no segments', () => {
    it('does not crash with empty segments', async () => {
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

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(getByText(/no guided plan available/i)).toBeInTheDocument();
      // createBufferSource shouldn't be called for empty workout
      expect(mockStart).not.toHaveBeenCalled();
    });
  });
});
