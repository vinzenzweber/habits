'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
  duration?: number;
}

// Throttle interval in ms (50ms = ~20fps, more efficient than 60fps)
const FRAME_INTERVAL = 50;

export function Confetti({ trigger, onComplete, duration = 1500 }: ConfettiProps) {
  const hasTriggeredRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated to avoid stale closure issues
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const end = Date.now() + duration;
    const colors = ['#34d399', '#10b981', '#6ee7b7', '#fbbf24', '#f59e0b'];
    let lastFrame = 0;

    const frame = (timestamp: number) => {
      // Throttle to ~20fps for better performance on low-end devices
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        animationRef.current = requestAnimationFrame(frame);
        return;
      }
      lastFrame = timestamp;

      // Fire from left side
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors
      });

      // Fire from right side
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors
      });

      if (Date.now() < end) {
        animationRef.current = requestAnimationFrame(frame);
      } else {
        animationRef.current = null;
        onCompleteRef.current?.();
      }
    };

    animationRef.current = requestAnimationFrame(frame);

    // Cleanup on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [trigger, duration]);

  // Reset trigger tracking when trigger becomes false
  useEffect(() => {
    if (!trigger) {
      hasTriggeredRef.current = false;
    }
  }, [trigger]);

  return null; // canvas-confetti creates its own canvas
}
