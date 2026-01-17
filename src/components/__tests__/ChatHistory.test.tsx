/**
 * Tests for ChatHistory component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatHistory } from '../ChatHistory';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSessions = [
  {
    id: 3,
    title: "Workout modification help",
    createdAt: new Date().toISOString(),
    preview: "How can I modify the Monday workout?",
    messageCount: 8,
  },
  {
    id: 2,
    title: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    preview: "What exercises help with back pain?",
    messageCount: 4,
  },
  {
    id: 1,
    title: "Getting started",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    preview: null,
    messageCount: 0,
  },
];

describe('ChatHistory', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectSession: vi.fn(),
    currentSessionId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('visibility', () => {
    it('returns null when not open', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: [], hasMore: false, nextCursor: null }),
      });

      const { container } = render(<ChatHistory {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when open', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Chat History')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading indicator initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ChatHistory {...defaultProps} />);

      // Loading state shows bouncing dots
      expect(document.querySelectorAll('.animate-bounce')).toHaveLength(3);
    });
  });

  describe('empty state', () => {
    it('shows empty state when no sessions exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: [], hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No conversations yet')).toBeInTheDocument();
        expect(screen.getByText('Start chatting to see your history here.')).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load chat history')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('retries fetch when retry button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
        });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Workout modification help')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('session list', () => {
    it('renders session list correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Workout modification help')).toBeInTheDocument();
        expect(screen.getByText('Getting started')).toBeInTheDocument();
      });
    });

    it('shows "New Chat" for sessions with null title', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New Chat')).toBeInTheDocument();
      });
    });

    it('shows preview in quotes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/"How can I modify the Monday workout\?"/)).toBeInTheDocument();
      });
    });

    it('shows message count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/8 messages/)).toBeInTheDocument();
        expect(screen.getByText(/4 messages/)).toBeInTheDocument();
        expect(screen.getByText(/0 messages/)).toBeInTheDocument();
      });
    });

    it('shows singular "message" for count of 1', async () => {
      const sessionsWithSingular = [
        {
          id: 1,
          title: "Single message session",
          createdAt: new Date().toISOString(),
          preview: "Test",
          messageCount: 1,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: sessionsWithSingular, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/1 message$/)).toBeInTheDocument();
      });
    });
  });

  describe('current session indicator', () => {
    it('highlights currently active session', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} currentSessionId={3} />);

      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument();
      });
    });

    it('does not show "Current" indicator for inactive sessions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} currentSessionId={3} />);

      await waitFor(() => {
        const currentIndicators = screen.getAllByText('Current');
        expect(currentIndicators).toHaveLength(1);
      });
    });
  });

  describe('session selection', () => {
    it('calls onSelectSession when session is clicked', async () => {
      const onSelectSession = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} onSelectSession={onSelectSession} />);

      await waitFor(() => {
        expect(screen.getByText('Workout modification help')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Workout modification help'));

      expect(onSelectSession).toHaveBeenCalledWith(3);
    });
  });

  describe('close functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close history')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Close history'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Chat History')).toBeInTheDocument();
      });

      // Click the backdrop (first element with aria-hidden="true")
      const backdrops = document.querySelectorAll('[aria-hidden="true"]');
      fireEvent.click(backdrops[0]);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('shows Load More button when hasMore is true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sessions: mockSessions,
          hasMore: true,
          nextCursor: 1,
        }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('does not show Load More button when hasMore is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sessions: mockSessions,
          hasMore: false,
          nextCursor: null,
        }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Workout modification help')).toBeInTheDocument();
      });

      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });

    it('fetches more sessions when Load More is clicked', async () => {
      const moreSessions = [
        {
          id: 0,
          title: "Older session",
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          preview: "Old message",
          messageCount: 2,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sessions: mockSessions,
            hasMore: true,
            nextCursor: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sessions: moreSessions,
            hasMore: false,
            nextCursor: null,
          }),
        });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Load More'));

      await waitFor(() => {
        expect(screen.getByText('Older session')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/chat/sessions?cursor=1');
    });
  });

  describe('date formatting', () => {
    it('shows "Today" for sessions from today', async () => {
      const todaySession = [
        {
          id: 1,
          title: "Today session",
          createdAt: new Date().toISOString(),
          preview: "Test",
          messageCount: 1,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: todaySession, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        // Look for the paragraph element containing date info
        const dateElements = document.querySelectorAll('.text-slate-400');
        const hasToday = Array.from(dateElements).some(el => el.textContent?.includes('Today'));
        expect(hasToday).toBe(true);
      });
    });

    it('shows "Yesterday" for sessions from yesterday', async () => {
      const yesterdaySession = [
        {
          id: 1,
          title: "Yesterday session",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          preview: "Test",
          messageCount: 1,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: yesterdaySession, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        // Look for the paragraph element containing date info
        const dateElements = document.querySelectorAll('.text-slate-400');
        const hasYesterday = Array.from(dateElements).some(el => el.textContent?.includes('Yesterday'));
        expect(hasYesterday).toBe(true);
      });
    });

    it('shows "X days ago" for recent sessions', async () => {
      const recentSession = [
        {
          id: 1,
          title: "Recent session",
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          preview: "Test",
          messageCount: 1,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: recentSession, hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        // Look for the paragraph element containing date info
        const dateElements = document.querySelectorAll('.text-slate-400');
        const hasDaysAgo = Array.from(dateElements).some(el => el.textContent?.includes('3 days ago'));
        expect(hasDaysAgo).toBe(true);
      });
    });
  });

  describe('data fetching', () => {
    it('fetches sessions when panel opens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessions: [], hasMore: false, nextCursor: null }),
      });

      render(<ChatHistory {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/sessions');
      });
    });

    it('does not fetch when panel is closed', () => {
      render(<ChatHistory {...defaultProps} isOpen={false} />);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
