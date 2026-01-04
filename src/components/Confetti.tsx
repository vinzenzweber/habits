'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
  duration?: number;
}

export function Confetti({ trigger, onComplete, duration = 1500 }: ConfettiProps) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!trigger || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const end = Date.now() + duration;
    const colors = ['#34d399', '#10b981', '#6ee7b7', '#fbbf24', '#f59e0b'];

    const frame = () => {
      // Fire from left side
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors
      });

      // Fire from right side
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        onComplete?.();
      }
    };

    frame();
  }, [trigger, onComplete, duration]);

  // Reset trigger tracking when trigger becomes false
  useEffect(() => {
    if (!trigger) {
      hasTriggeredRef.current = false;
    }
  }, [trigger]);

  return null; // canvas-confetti creates its own canvas
}
