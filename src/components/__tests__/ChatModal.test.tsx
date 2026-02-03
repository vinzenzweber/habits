/**
 * Tests for ChatModal component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatModal } from '../ChatModal';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock scrollIntoView
const mockScrollIntoView = vi.fn();

// Store the original Element.prototype.scrollIntoView
const originalScrollIntoView = Element.prototype.scrollIntoView;

describe('ChatModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockScrollIntoView.mockClear();

    // Mock scrollIntoView on Element prototype
    Element.prototype.scrollIntoView = mockScrollIntoView;

    // Mock visualViewport
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height: 800,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(min-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    // Restore the original scrollIntoView
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  describe('visibility', () => {
    it('returns null when not open', () => {
      const { container } = render(<ChatModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when open', () => {
      render(<ChatModal {...defaultProps} />);
      // Translation mock returns the key
      expect(screen.getByText('fitStreakAI')).toBeInTheDocument();
    });
  });

  describe('auto-scroll on open', () => {
    it('scrolls to bottom when modal opens', async () => {
      render(<ChatModal {...defaultProps} />);

      // The useEffect should have triggered scrollIntoView
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('scrolls to bottom when modal opens with existing messages', async () => {
      // First render with modal closed
      const { rerender } = render(<ChatModal {...defaultProps} isOpen={false} />);

      // Clear any previous calls
      mockScrollIntoView.mockClear();

      // Rerender with modal open
      rerender(<ChatModal {...defaultProps} isOpen={true} />);

      // Should scroll to bottom when opening
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('scrolls to bottom when reopening modal with pre-populated messages (issue #325)', async () => {
      // Mock successful API response with streaming messages
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode('data: {"type":"session","sessionId":1}\n'),
                })
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode('data: {"type":"content","content":"Hello!"}\n'),
                })
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode('data: {"type":"done","toolCalls":[]}\n'),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              cancel: vi.fn().mockResolvedValue(undefined),
            }),
          },
        })
      );

      // 1. Render modal open
      const { rerender } = render(<ChatModal {...defaultProps} isOpen={true} />);

      // 2. Send a message to populate messages state
      const textarea = screen.getByPlaceholderText('typeMessage');
      const sendButton = screen.getByText('send');

      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Wait for message to be sent and response to appear
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Hello!/)).toBeInTheDocument();
      });

      // Clear scroll calls from sending message
      mockScrollIntoView.mockClear();

      // 3. Close the modal
      rerender(<ChatModal {...defaultProps} isOpen={false} />);

      // 4. Reopen the modal with existing messages in state
      rerender(<ChatModal {...defaultProps} isOpen={true} />);

      // 5. Verify scrollIntoView was called when reopening with existing messages
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('does not scroll when modal is closed', () => {
      render(<ChatModal {...defaultProps} isOpen={false} />);

      // scrollIntoView should not be called when modal is closed
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('close functionality', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ChatModal {...defaultProps} onClose={onClose} />);

      // Find the close button by its aria-label (translation mock returns key)
      fireEvent.click(screen.getByLabelText('close'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when mobile backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<ChatModal {...defaultProps} onClose={onClose} />);

      // Click the backdrop (first element with aria-hidden="true")
      const backdrops = document.querySelectorAll('[aria-hidden="true"]');
      fireEvent.click(backdrops[0]);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('shows welcome message when no messages', () => {
      render(<ChatModal {...defaultProps} />);

      // Translation mock returns keys
      expect(screen.getByText('aiAssistantDescription')).toBeInTheDocument();
      expect(screen.getByText('canHelpWith')).toBeInTheDocument();
    });

    it('shows help options in empty state', () => {
      render(<ChatModal {...defaultProps} />);

      // Translation mock returns keys
      expect(screen.getByText(/helpExercise/)).toBeInTheDocument();
      expect(screen.getByText(/helpRecipe/)).toBeInTheDocument();
      expect(screen.getByText(/helpProgress/)).toBeInTheDocument();
      expect(screen.getByText(/helpMotivation/)).toBeInTheDocument();
      expect(screen.getByText(/helpEquipment/)).toBeInTheDocument();
    });
  });

  describe('input handling', () => {
    it('disables send button when input is empty', () => {
      render(<ChatModal {...defaultProps} />);

      const sendButton = screen.getByText('send');
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', () => {
      render(<ChatModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('typeMessage');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      const sendButton = screen.getByText('send');
      expect(sendButton).not.toBeDisabled();
    });

  });

  describe('history button', () => {
    it('shows history button', () => {
      render(<ChatModal {...defaultProps} />);

      // Translation mock returns key
      expect(screen.getByText('history')).toBeInTheDocument();
    });
  });

  describe('new chat button', () => {
    it('does not show new chat button when no messages', () => {
      render(<ChatModal {...defaultProps} />);

      // Translation mock returns key
      expect(screen.queryByText('newChat')).not.toBeInTheDocument();
    });
  });
});
