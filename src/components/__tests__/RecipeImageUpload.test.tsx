/**
 * Tests for RecipeImageUpload component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecipeImageUpload } from '../RecipeImageUpload';
import type { RecipeImage } from '@/lib/recipe-types';

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
    <img src={src} alt={alt} className={className} data-testid="recipe-image" />
  ),
}));

// Mock image-utils
vi.mock('@/lib/image-utils', () => ({
  validateImageFile: vi.fn(() => ({ valid: true })),
  resizeImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }))),
  generateImageId: vi.fn(() => 'mock-uuid-1234'),
}));

import { validateImageFile, resizeImage } from '@/lib/image-utils';

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockImages: RecipeImage[] = [
  { url: '/api/recipes/images/user1/img1', isPrimary: true, caption: 'Main dish' },
  { url: '/api/recipes/images/user1/img2', caption: 'Side view' },
];

describe('RecipeImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: '/api/recipes/images/user1/new-image' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders drop zone', () => {
      render(<RecipeImageUpload images={[]} onChange={() => {}} />);
      expect(screen.getByText(/drop images here/i)).toBeInTheDocument();
    });

    it('renders existing images', () => {
      render(<RecipeImageUpload images={mockImages} onChange={() => {}} />);
      const images = screen.getAllByTestId('recipe-image');
      expect(images).toHaveLength(2);
    });

    it('shows primary badge on primary image', () => {
      render(<RecipeImageUpload images={mockImages} onChange={() => {}} />);
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('renders image count correctly', () => {
      render(<RecipeImageUpload images={mockImages} onChange={() => {}} maxImages={10} />);
      expect(screen.getByText('2 of 10 images')).toBeInTheDocument();
    });

    it('shows required message when no images', () => {
      render(<RecipeImageUpload images={[]} onChange={() => {}} />);
      expect(screen.getByText(/at least 1 required/i)).toBeInTheDocument();
    });

    it('hides drop zone when maxImages reached', () => {
      const images: RecipeImage[] = [
        { url: '/img1', isPrimary: true },
        { url: '/img2' },
        { url: '/img3' },
      ];
      render(<RecipeImageUpload images={images} onChange={() => {}} maxImages={3} />);
      expect(screen.queryByText(/drop images here/i)).not.toBeInTheDocument();
    });

    it('renders caption inputs for each image', () => {
      render(<RecipeImageUpload images={mockImages} onChange={() => {}} />);
      const captionInputs = screen.getAllByPlaceholderText('Caption (optional)');
      expect(captionInputs).toHaveLength(2);
    });
  });

  describe('file validation', () => {
    it('shows error for invalid file type', async () => {
      // Set up mock to return invalid for file validation
      vi.mocked(validateImageFile).mockImplementation(() => ({
        valid: false,
        error: 'Invalid file type',
      }));

      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={[]} onChange={onChange} />);

      // Use an image MIME type to pass the browser's accept filter,
      // but our mock will reject it as invalid
      const file = new File(['test'], 'corrupted.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      // The error message format is "filename: error message"
      await waitFor(() => {
        expect(screen.getByText(/corrupted\.jpg: Invalid file type/i)).toBeInTheDocument();
      });

      // onChange should not be called for invalid file
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows error when max images exceeded', async () => {
      const user = userEvent.setup();
      const images: RecipeImage[] = [{ url: '/img1', isPrimary: true }];
      render(<RecipeImageUpload images={images} onChange={() => {}} maxImages={2} />);

      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, [file1, file2]);

      await waitFor(() => {
        expect(screen.getByText(/Maximum 2 images allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe('file upload', () => {
    it('uploads valid file and calls onChange', async () => {
      // Ensure mocks return valid state for successful upload
      vi.mocked(validateImageFile).mockReturnValue({ valid: true });
      vi.mocked(resizeImage).mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' }));

      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={[]} onChange={onChange} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(resizeImage).toHaveBeenCalledWith(file);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/recipes/images/upload',
          expect.objectContaining({ method: 'POST' })
        );
        expect(onChange).toHaveBeenCalledWith([
          expect.objectContaining({
            url: '/api/recipes/images/user1/new-image',
            isPrimary: true, // First image is primary
          }),
        ]);
      });
    });

    it('sets first uploaded image as primary', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={[]} onChange={onChange} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith([
          expect.objectContaining({ isPrimary: true }),
        ]);
      });
    });

    it('handles upload error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });

      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={[]} onChange={onChange} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('notifies parent of uploading state', async () => {
      const user = userEvent.setup();
      const onUploadingChange = vi.fn();

      // Make fetch take some time
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ url: '/api/recipes/images/user1/new' }),
                }),
              100
            )
          )
      );

      render(
        <RecipeImageUpload
          images={[]}
          onChange={() => {}}
          onUploadingChange={onUploadingChange}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      expect(onUploadingChange).toHaveBeenCalledWith(true);

      await waitFor(() => {
        expect(onUploadingChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('drag and drop', () => {
    it('shows drag over state on dragOver', () => {
      render(<RecipeImageUpload images={[]} onChange={() => {}} />);

      // Get the drop zone div that has the onDragOver handler
      const dropZone = screen.getByText(/drop images here/i).closest('div[class*="border-dashed"]');
      fireEvent.dragOver(dropZone!);

      expect(dropZone).toHaveClass('border-emerald-500');
    });

    it('removes drag over state on dragLeave', () => {
      render(<RecipeImageUpload images={[]} onChange={() => {}} />);

      const dropZone = screen.getByText(/drop images here/i).closest('div[class*="border-dashed"]');
      fireEvent.dragOver(dropZone!);
      expect(dropZone).toHaveClass('border-emerald-500');

      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-emerald-500');
    });
  });

  describe('image management', () => {
    it('removes image on delete button click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={mockImages} onChange={onChange} />);

      // The delete buttons are always in the DOM but hidden with opacity-0 via group-hover
      // We can still click them directly
      const deleteButtons = screen.getAllByTitle('Remove');
      await user.click(deleteButtons[0]);

      // First image removed, second one remains (but not yet promoted to primary since
      // we're testing the remove action, not the result - see 'makes next image primary' test)
      expect(onChange).toHaveBeenCalledWith([
        { ...mockImages[1], isPrimary: true },
      ]);
    });

    it('makes next image primary when primary is removed', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={mockImages} onChange={onChange} />);

      // Find and click delete button for primary image
      const deleteButtons = screen.getAllByTitle('Remove');
      await user.click(deleteButtons[0]);

      expect(onChange).toHaveBeenCalledWith([
        { ...mockImages[1], isPrimary: true },
      ]);
    });

    it('sets image as primary on star button click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={mockImages} onChange={onChange} />);

      // Find and click set primary button for second image
      const primaryButtons = screen.getAllByTitle('Set as primary');
      await user.click(primaryButtons[0]); // There's only one (first image is already primary)

      expect(onChange).toHaveBeenCalledWith([
        { ...mockImages[0], isPrimary: false },
        { ...mockImages[1], isPrimary: true },
      ]);
    });

    it('updates caption on input change', () => {
      const onChange = vi.fn();
      render(<RecipeImageUpload images={mockImages} onChange={onChange} />);

      const captionInputs = screen.getAllByPlaceholderText('Caption (optional)');
      fireEvent.change(captionInputs[0], { target: { value: 'New caption' } });

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].caption).toBe('New caption');
    });

    it('removes caption when cleared', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<RecipeImageUpload images={mockImages} onChange={onChange} />);

      const captionInputs = screen.getAllByPlaceholderText('Caption (optional)');
      await user.clear(captionInputs[0]);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].caption).toBeUndefined();
    });
  });

  describe('disabled state', () => {
    it('disables file input when disabled', () => {
      render(<RecipeImageUpload images={[]} onChange={() => {}} disabled />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('disables caption inputs when disabled', () => {
      render(<RecipeImageUpload images={mockImages} onChange={() => {}} disabled />);
      const captionInputs = screen.getAllByPlaceholderText('Caption (optional)');
      captionInputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it('shows disabled styling on drop zone', () => {
      render(<RecipeImageUpload images={[]} onChange={() => {}} disabled />);
      // The disabled class is applied to the border-dashed container
      const dropZone = screen.getByText(/drop images here/i).closest('div[class*="border-dashed"]');
      expect(dropZone).toHaveClass('opacity-50');
    });
  });
});
