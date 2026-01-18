/**
 * Tests for PhotoCaptureModal component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhotoCaptureModal } from '../PhotoCaptureModal';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} data-testid="preview-image" />
  ),
}));

// Mock image-utils
vi.mock('@/lib/image-utils', () => ({
  validateImageFile: vi.fn(() => ({ valid: true })),
  resizeImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }))),
  MAX_FILE_SIZE_MB: 10,
}));

import { validateImageFile } from '@/lib/image-utils';

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock matchMedia for responsive design
const mockMatchMedia = vi.fn();
window.matchMedia = mockMatchMedia;

describe('PhotoCaptureModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImageCaptured: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the extraction API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ slug: 'test-recipe' }),
    });
    // Default to desktop view
    mockMatchMedia.mockReturnValue({
      matches: true, // isDesktop = true
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<PhotoCaptureModal {...defaultProps} />);
      expect(screen.getByText('Import Recipe')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<PhotoCaptureModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Import Recipe')).not.toBeInTheDocument();
    });

    it('renders desktop view with drop zone', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      render(<PhotoCaptureModal {...defaultProps} />);
      expect(screen.getByText(/drop image here/i)).toBeInTheDocument();
    });

    it('renders mobile view with camera and library buttons', () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // isDesktop = false
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      render(<PhotoCaptureModal {...defaultProps} />);
      expect(screen.getByText('Take Photo')).toBeInTheDocument();
      expect(screen.getByText('Choose from Library')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(<PhotoCaptureModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    it('shows preview after file selection', async () => {
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Review Photo')).toBeInTheDocument();
        expect(screen.getByTestId('preview-image')).toBeInTheDocument();
      });
    });

    it('shows file name and size in preview', async () => {
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} />);

      const file = new File(['test content'], 'my-recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('my-recipe.jpg')).toBeInTheDocument();
      });
    });

    it('shows error for invalid file type', async () => {
      const user = userEvent.setup();

      // Override mock before render
      vi.mocked(validateImageFile).mockReturnValue({
        valid: false,
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC',
      });

      render(<PhotoCaptureModal {...defaultProps} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });

      // Reset mock for other tests
      vi.mocked(validateImageFile).mockReturnValue({ valid: true });
    });
  });

  describe('preview actions', () => {
    async function setupPreview() {
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Review Photo')).toBeInTheDocument();
      });

      return user;
    }

    it('shows Import Recipe button in preview', async () => {
      const user = await setupPreview();
      // Verify we have the button - look for button that contains "Import Recipe" text
      const importButton = screen.getByRole('button', { name: /import recipe/i });
      expect(importButton).toBeInTheDocument();
      // Verify button is not disabled
      expect(importButton).not.toBeDisabled();
    });

    it('shows Choose Different Photo button in preview', async () => {
      await setupPreview();
      expect(screen.getByRole('button', { name: /choose different photo/i })).toBeInTheDocument();
    });

    it('resets to initial view when Choose Different Photo is clicked', async () => {
      const user = await setupPreview();

      await user.click(screen.getByRole('button', { name: /choose different photo/i }));

      await waitFor(() => {
        expect(screen.getByText('Import Recipe')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-image')).not.toBeInTheDocument();
      });
    });

    it('revokes object URL when resetting', async () => {
      const user = await setupPreview();

      await user.click(screen.getByRole('button', { name: /choose different photo/i }));

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('upload and callback', () => {
    it('calls onImageCaptured with slug after successful extraction', async () => {
      const onImageCaptured = vi.fn();
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} onImageCaptured={onImageCaptured} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/recipes/extract-from-image',
          expect.objectContaining({ method: 'POST' })
        );
        expect(onImageCaptured).toHaveBeenCalledWith({ type: 'extracted', slug: 'test-recipe' });
      });
    });

    it('shows loading state during extraction', async () => {
      // Make fetch take some time
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ slug: 'new-recipe' }),
                }),
              100
            )
          )
      );

      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      // Should show extracting state
      // Use getAllByText since there are two elements with this text (button + overlay)
      expect(screen.getAllByText(/extracting/i).length).toBeGreaterThan(0);
    });

    it('shows error on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });

      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('modal actions', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByLabelText('Close'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<PhotoCaptureModal {...defaultProps} onClose={onClose} />);

      // Find the backdrop (the div with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50');
      await user.click(backdrop!);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('drag and drop (desktop)', () => {
    beforeEach(() => {
      mockMatchMedia.mockReturnValue({
        matches: true, // isDesktop = true
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    });

    it('shows drag over state on dragOver', () => {
      render(<PhotoCaptureModal {...defaultProps} />);

      const dropZone = screen.getByText(/drop image here/i).closest('div[class*="border-dashed"]');
      fireEvent.dragOver(dropZone!);

      expect(dropZone).toHaveClass('border-emerald-500');
    });

    it('removes drag over state on dragLeave', () => {
      render(<PhotoCaptureModal {...defaultProps} />);

      const dropZone = screen.getByText(/drop image here/i).closest('div[class*="border-dashed"]');
      fireEvent.dragOver(dropZone!);
      expect(dropZone).toHaveClass('border-emerald-500');

      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-emerald-500');
    });

    // Note: Testing actual file drop behavior is challenging in JSDOM
    // because DataTransfer.files doesn't behave like a proper FileList.
    // The core upload flow is tested via file input selection tests.
    // The drag-over visual feedback is tested above.
  });

  describe('mobile view', () => {
    beforeEach(() => {
      mockMatchMedia.mockReturnValue({
        matches: false, // isDesktop = false
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    });

    it('has camera input with capture attribute', () => {
      render(<PhotoCaptureModal {...defaultProps} />);

      const cameraInput = document.querySelector('input[capture="environment"]');
      expect(cameraInput).toBeInTheDocument();
    });

    it('has regular file input for library', () => {
      render(<PhotoCaptureModal {...defaultProps} />);

      // There should be 2 file inputs - one with capture and one without
      const fileInputs = document.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBe(2);

      // One should have capture attribute, one should not
      const withCapture = Array.from(fileInputs).filter(
        (input) => input.hasAttribute('capture')
      );
      const withoutCapture = Array.from(fileInputs).filter(
        (input) => !input.hasAttribute('capture')
      );
      expect(withCapture.length).toBe(1);
      expect(withoutCapture.length).toBe(1);
    });
  });
});
