/**
 * Tests for RecipeImportModal component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecipeImportModal } from '../RecipeImportModal';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

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
  validateImportFile: vi.fn(() => ({ valid: true, fileType: 'image' })),
  resizeImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }))),
  MAX_FILE_SIZE_MB: 10,
}));

import { validateImportFile } from '@/lib/image-utils';

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

describe('RecipeImportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImageCaptured: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to default behavior
    vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'image' });
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
      render(<RecipeImportModal {...defaultProps} />);
      expect(screen.getByText('Import Recipe')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<RecipeImportModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Import Recipe')).not.toBeInTheDocument();
    });

    it('renders desktop view with drop zone', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      render(<RecipeImportModal {...defaultProps} />);
      expect(screen.getByText(/drop file here/i)).toBeInTheDocument();
    });

    it('renders mobile view with camera and library buttons', () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // isDesktop = false
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      render(<RecipeImportModal {...defaultProps} />);
      expect(screen.getByText('Take Photo')).toBeInTheDocument();
      expect(screen.getByText('Choose File')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(<RecipeImportModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    it('shows preview after image file selection', async () => {
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Review File')).toBeInTheDocument();
        expect(screen.getByTestId('preview-image')).toBeInTheDocument();
      });
    });

    it('shows PDF preview after PDF file selection', async () => {
      vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'pdf' });
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'recipes.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      // Wait for component to update - use waitFor with explicit check
      await waitFor(() => {
        // PDF preview should show the import button (indicates preview state)
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      // Verify PDF-specific content is shown
      expect(screen.getByText(/click import to extract recipes/i)).toBeInTheDocument();
    });

    it('shows file name and size in preview', async () => {
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test content'], 'my-recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('my-recipe.jpg')).toBeInTheDocument();
      });
    });

    it('shows error for invalid file type', async () => {
      // Override mock before render
      vi.mocked(validateImportFile).mockReturnValue({
        valid: false,
        error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, HEIC, or PDF',
      });

      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Use fireEvent.change for more direct control
      fireEvent.change(input, { target: { files: [file] } });

      await screen.findByText(/Unsupported file type/i);
    });
  });

  describe('preview actions', () => {
    async function setupPreview() {
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Review File')).toBeInTheDocument();
      });

      return user;
    }

    it('shows Import Recipe button in preview', async () => {
      await setupPreview();
      const importButton = screen.getByRole('button', { name: /import recipe/i });
      expect(importButton).toBeInTheDocument();
      expect(importButton).not.toBeDisabled();
    });

    it('shows Choose Different File button in preview', async () => {
      await setupPreview();
      expect(screen.getByRole('button', { name: /choose different file/i })).toBeInTheDocument();
    });

    it('resets to initial view when Choose Different File is clicked', async () => {
      const user = await setupPreview();

      await user.click(screen.getByRole('button', { name: /choose different file/i }));

      await waitFor(() => {
        expect(screen.getByText('Import Recipe')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-image')).not.toBeInTheDocument();
      });
    });

    it('revokes object URL when resetting', async () => {
      const user = await setupPreview();

      await user.click(screen.getByRole('button', { name: /choose different file/i }));

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('image upload and callback', () => {
    it('calls onImageCaptured with slug after successful extraction', async () => {
      const onImageCaptured = vi.fn();
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} onImageCaptured={onImageCaptured} />);

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
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'recipe.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      expect(screen.getAllByText(/extracting/i).length).toBeGreaterThan(0);
    });

    it('shows error on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });

      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

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

  describe('PDF upload and callback (async polling)', () => {
    it('calls PDF API and polls for single recipe result', async () => {
      vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'pdf' });

      // Mock POST to return jobId, then mock GET for polling
      let pollCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/recipes/extract-from-pdf') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jobId: 123 }),
          });
        }
        if (url === '/api/recipes/extract-from-pdf/123') {
          pollCount++;
          // First poll: still processing, second poll: completed
          if (pollCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                status: 'processing',
                progress: { currentPage: 0, totalPages: 1, recipesExtracted: 0 },
                recipes: [],
                skippedPages: [],
              }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              progress: { currentPage: 1, totalPages: 1, recipesExtracted: 1 },
              recipes: [{ slug: 'pdf-recipe', title: 'PDF Recipe', pageNumber: 1 }],
              skippedPages: [],
            }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      const onImageCaptured = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} onImageCaptured={onImageCaptured} onClose={onClose} />);

      const file = new File(['test'], 'recipes.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      // Wait for polling to complete and callback to be called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/recipes/extract-from-pdf',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // Wait for polling to complete
      await waitFor(() => {
        expect(onImageCaptured).toHaveBeenCalledWith({ type: 'extracted', slug: 'pdf-recipe' });
      }, { timeout: 5000 });
    });

    it('shows results for multi-recipe PDFs via polling', async () => {
      vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'pdf' });

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/recipes/extract-from-pdf') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jobId: 456 }),
          });
        }
        if (url === '/api/recipes/extract-from-pdf/456') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              progress: { currentPage: 2, totalPages: 2, recipesExtracted: 2 },
              recipes: [
                { slug: 'recipe-1', title: 'Recipe 1', pageNumber: 1 },
                { slug: 'recipe-2', title: 'Recipe 2', pageNumber: 2 },
              ],
              skippedPages: [],
            }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'recipes.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      // Wait for import results via polling
      await screen.findByText('Recipe 1', {}, { timeout: 5000 });
      await screen.findByText('Recipe 2');
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('shows error when no recipes found in PDF via polling', async () => {
      vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'pdf' });

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/recipes/extract-from-pdf') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jobId: 789 }),
          });
        }
        if (url === '/api/recipes/extract-from-pdf/789') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              progress: { currentPage: 1, totalPages: 1, recipesExtracted: 0 },
              recipes: [],
              skippedPages: [1],
            }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'empty.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      // Error message should appear via polling
      await screen.findByText(/no recipes were found in this pdf/i, {}, { timeout: 5000 });
    });

    it('shows progress during polling', async () => {
      vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'pdf' });

      let pollCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/recipes/extract-from-pdf') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jobId: 111 }),
          });
        }
        if (url === '/api/recipes/extract-from-pdf/111') {
          pollCount++;
          // Return processing first, then completed on second poll
          if (pollCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                status: 'processing',
                progress: { currentPage: 1, totalPages: 3, recipesExtracted: 1 },
                recipes: [{ slug: 'r1', title: 'First Recipe', pageNumber: 1 }],
                skippedPages: [],
              }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              progress: { currentPage: 3, totalPages: 3, recipesExtracted: 2 },
              recipes: [
                { slug: 'r1', title: 'First Recipe', pageNumber: 1 },
                { slug: 'r2', title: 'Second Recipe', pageNumber: 3 },
              ],
              skippedPages: [2],
            }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'multi.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      // Should show processing state with partial results
      await waitFor(() => {
        // Look for partial results list showing the first recipe
        const partialResult = screen.queryByText('First Recipe');
        expect(partialResult).toBeInTheDocument();
      }, { timeout: 6000 });

      // Eventually shows completed results (2 recipes in import results view)
      await screen.findByRole('button', { name: /done/i }, { timeout: 6000 });
      expect(screen.getByText('Second Recipe')).toBeInTheDocument();
    }, 15000); // Increase test timeout to 15s due to polling intervals

    it('handles polling error gracefully', async () => {
      vi.mocked(validateImportFile).mockReturnValue({ valid: true, fileType: 'pdf' });

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/recipes/extract-from-pdf') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jobId: 222 }),
          });
        }
        if (url === '/api/recipes/extract-from-pdf/222') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'failed',
              progress: { currentPage: 1, totalPages: 2, recipesExtracted: 0 },
              recipes: [],
              skippedPages: [],
              error: 'PDF processing failed',
            }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} />);

      const file = new File(['test'], 'bad.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import recipe/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /import recipe/i }));

      // Error from job failure should appear
      await screen.findByText(/pdf processing failed/i, {}, { timeout: 5000 });
    });
  });

  describe('modal actions', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByLabelText('Close'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<RecipeImportModal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('.bg-black\\/50');
      await user.click(backdrop!);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('drag and drop (desktop)', () => {
    beforeEach(() => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    });

    it('shows drag over state on dragOver', () => {
      render(<RecipeImportModal {...defaultProps} />);

      const dropZone = screen.getByText(/drop file here/i).closest('div[class*="border-dashed"]');
      fireEvent.dragOver(dropZone!);

      expect(dropZone).toHaveClass('border-emerald-500');
    });

    it('removes drag over state on dragLeave', () => {
      render(<RecipeImportModal {...defaultProps} />);

      const dropZone = screen.getByText(/drop file here/i).closest('div[class*="border-dashed"]');
      fireEvent.dragOver(dropZone!);
      expect(dropZone).toHaveClass('border-emerald-500');

      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-emerald-500');
    });
  });

  describe('mobile view', () => {
    beforeEach(() => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    });

    it('has camera input with capture attribute', () => {
      render(<RecipeImportModal {...defaultProps} />);

      const cameraInput = document.querySelector('input[capture="environment"]');
      expect(cameraInput).toBeInTheDocument();
    });

    it('has regular file input for library', () => {
      render(<RecipeImportModal {...defaultProps} />);

      const fileInputs = document.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBe(2);

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
