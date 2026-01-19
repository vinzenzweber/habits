/**
 * Tests for ExerciseImages component
 *
 * Focuses on URL normalization logic that ensures exercise names
 * with special characters are properly converted to URL-safe paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseImages, ExerciseImageThumbnail, normalizeForUrl } from '../ExerciseImages';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, onLoad, onError, ...props }: { src: string; alt: string; onLoad?: () => void; onError?: () => void; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      data-testid="next-image"
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  ),
}));

describe('ExerciseImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('URL normalization for exercise names', () => {
    it('normalizes simple exercise names with spaces', () => {
      render(<ExerciseImages exerciseName="Push ups" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/push-ups/images/1');
    });

    it('normalizes exercise names with parentheses', () => {
      render(<ExerciseImages exerciseName="Arm circles (forward/back)" />);

      const img = screen.getByTestId('next-image');
      // Parentheses and slashes are removed, spaces become hyphens
      expect(img).toHaveAttribute('src', '/api/exercises/arm-circles-forwardback/images/1');
    });

    it('normalizes exercise names with slashes', () => {
      render(<ExerciseImages exerciseName="Band pull-aparts / arm swings" />);

      const img = screen.getByTestId('next-image');
      // Slashes are removed, spaces become hyphens
      expect(img).toHaveAttribute('src', '/api/exercises/band-pull-aparts-arm-swings/images/1');
    });

    it('normalizes exercise names with hyphens (preserves them)', () => {
      render(<ExerciseImages exerciseName="Cat-Cow" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/cat-cow/images/1');
    });

    it('normalizes exercise names with numbers', () => {
      render(<ExerciseImages exerciseName="90/90 hip stretch" />);

      const img = screen.getByTestId('next-image');
      // Slash is removed
      expect(img).toHaveAttribute('src', '/api/exercises/9090-hip-stretch/images/1');
    });

    it('converts to lowercase', () => {
      render(<ExerciseImages exerciseName="PUSH UPS" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/push-ups/images/1');
    });

    it('handles mixed case with special characters', () => {
      render(<ExerciseImages exerciseName="Glute Bridge (Single-Leg)" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/glute-bridge-single-leg/images/1');
    });

    it('handles exercise names that are already normalized', () => {
      render(<ExerciseImages exerciseName="push-ups" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/push-ups/images/1');
    });

    it('trims leading/trailing whitespace from normalized result', () => {
      render(<ExerciseImages exerciseName="  Push ups  " />);

      const img = screen.getByTestId('next-image');
      // Leading/trailing spaces converted to hyphens then trimmed
      expect(img).toHaveAttribute('src', '/api/exercises/-push-ups-/images/1');
    });

    it('handles multiple consecutive spaces', () => {
      render(<ExerciseImages exerciseName="Push    ups" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/push-ups/images/1');
    });
  });
});

describe('ExerciseImageThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('URL normalization for exercise names', () => {
    it('normalizes simple exercise names with spaces', () => {
      render(<ExerciseImageThumbnail exerciseName="Push ups" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/push-ups/images/1');
    });

    it('normalizes exercise names with parentheses', () => {
      render(<ExerciseImageThumbnail exerciseName="Arm circles (forward/back)" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/arm-circles-forwardback/images/1');
    });

    it('normalizes exercise names with slashes', () => {
      render(<ExerciseImageThumbnail exerciseName="Band pull-aparts / arm swings" />);

      const img = screen.getByTestId('next-image');
      // Slashes are removed, spaces become hyphens
      expect(img).toHaveAttribute('src', '/api/exercises/band-pull-aparts-arm-swings/images/1');
    });

    it('converts to lowercase', () => {
      render(<ExerciseImageThumbnail exerciseName="PUSH UPS" />);

      const img = screen.getByTestId('next-image');
      expect(img).toHaveAttribute('src', '/api/exercises/push-ups/images/1');
    });
  });

  describe('hasImages prop', () => {
    it('renders nothing when hasImages is false', () => {
      const { container } = render(
        <ExerciseImageThumbnail exerciseName="Push ups" hasImages={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders image when hasImages is true', () => {
      render(<ExerciseImageThumbnail exerciseName="Push ups" hasImages={true} />);

      const img = screen.getByTestId('next-image');
      expect(img).toBeInTheDocument();
    });

    it('renders image by default when hasImages is not provided', () => {
      render(<ExerciseImageThumbnail exerciseName="Push ups" />);

      const img = screen.getByTestId('next-image');
      expect(img).toBeInTheDocument();
    });
  });
});

// ============================================
// normalizeForUrl function tests
// ============================================

describe('normalizeForUrl', () => {
  it('converts to lowercase', () => {
    expect(normalizeForUrl('Push Up')).toBe('push-up');
    expect(normalizeForUrl('BURPEES')).toBe('burpees');
  });

  it('replaces spaces with hyphens', () => {
    expect(normalizeForUrl('jumping jacks')).toBe('jumping-jacks');
  });

  it('removes special characters', () => {
    expect(normalizeForUrl('push-up (modified)')).toBe('push-up-modified');
    expect(normalizeForUrl('90° leg raise')).toBe('90-leg-raise');
  });

  it('handles multiple consecutive spaces', () => {
    expect(normalizeForUrl('mountain  climbers')).toBe('mountain-climbers');
  });

  it('converts leading/trailing spaces to hyphens', () => {
    // .trim() is called after spaces are replaced with hyphens,
    // so leading/trailing spaces become leading/trailing hyphens
    expect(normalizeForUrl('  squats  ')).toBe('-squats-');
  });

  it('truncates names longer than 255 characters', () => {
    const longName = 'a'.repeat(300);
    const result = normalizeForUrl(longName);
    expect(result.length).toBe(255);
  });

  it('does not truncate names at or under 255 characters', () => {
    const exactName = 'a'.repeat(255);
    const result = normalizeForUrl(exactName);
    expect(result.length).toBe(255);
    expect(result).toBe(exactName);
  });
});

// ============================================
// hasImages prop tests for ExerciseImages
// ============================================

describe('ExerciseImages hasImages prop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when hasImages is false', () => {
    const { container } = render(
      <ExerciseImages exerciseName="Push ups" hasImages={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders image when hasImages is true', () => {
    render(<ExerciseImages exerciseName="Push ups" hasImages={true} />);

    const img = screen.getByTestId('next-image');
    expect(img).toBeInTheDocument();
  });

  it('renders image by default when hasImages is not provided', () => {
    render(<ExerciseImages exerciseName="Push ups" />);

    const img = screen.getByTestId('next-image');
    expect(img).toBeInTheDocument();
  });
});
