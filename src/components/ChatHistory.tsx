'use client';
import { useState, useEffect, useCallback } from 'react';

interface ChatSession {
  id: number;
  title: string | null;
  createdAt: string;
  preview: string | null;
  messageCount: number;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: number) => void;
  currentSessionId: number | null;
}

export function ChatHistory({
  isOpen,
  onClose,
  onSelectSession,
  currentSessionId
}: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const fetchSessions = useCallback(async (cursor?: number) => {
    try {
      const isLoadMore = cursor !== undefined;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = cursor
        ? `/api/chat/sessions?cursor=${cursor}`
        : '/api/chat/sessions';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();

      if (isLoadMore) {
        setSessions(prev => [...prev, ...data.sessions]);
      } else {
        setSessions(data.sessions);
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Fetch sessions when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSessions([]);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
    }
  }, [isOpen]);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchSessions(nextCursor);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="fixed z-[70] bg-slate-900 flex flex-col transition-all duration-300 ease-in-out
          inset-x-0 bottom-0 rounded-t-lg h-[70vh]
          md:inset-x-auto md:inset-y-0 md:right-[400px] md:w-[320px] md:h-screen md:rounded-none md:border-l md:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="p-4 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => fetchSessions()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && sessions.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-lg mb-2">No conversations yet</p>
              <p className="text-sm">
                Start chatting to see your history here.
              </p>
            </div>
          )}

          {/* Session list */}
          {!loading && !error && sessions.length > 0 && (
            <div className="divide-y divide-slate-700/50">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left p-4 hover:bg-slate-800 transition ${
                    currentSessionId === session.id ? 'bg-slate-800 border-l-2 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white truncate">
                        {session.title || 'New Chat'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(session.createdAt)} • {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
                      </p>
                      {session.preview && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          &quot;{session.preview}{session.preview.length >= 100 ? '...' : ''}&quot;
                        </p>
                      )}
                    </div>
                    {currentSessionId === session.id && (
                      <span className="text-xs text-emerald-400 whitespace-nowrap">Current</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Load more button */}
          {hasMore && !loading && (
            <div className="p-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm transition"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
