'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatOpenOptions {
  initialMessage?: string;
  autoSend?: boolean;
  completionId?: number;
}

interface PageContext {
  page: string;
  workoutSlug?: string;
  workoutTitle?: string;
}

interface ChatContextType {
  isOpen: boolean;
  openChat: (options?: ChatOpenOptions) => void;
  closeChat: () => void;
  initialMessage: string | null;
  autoSend: boolean;
  completionId: number | null;
  clearMessageState: () => void;
  pageContext: PageContext | null;
  setPageContext: (context: PageContext | null) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [autoSend, setAutoSend] = useState(false);
  const [completionId, setCompletionId] = useState<number | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  const openChat = useCallback((options?: ChatOpenOptions) => {
    setInitialMessage(options?.initialMessage ?? null);
    setAutoSend(options?.autoSend ?? false);
    setCompletionId(options?.completionId ?? null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    // Clear completionId when chat closes to ensure clean state
    setCompletionId(null);
  }, []);

  const clearMessageState = useCallback(() => {
    setInitialMessage(null);
    setAutoSend(false);
    // Keep completionId for rating buttons until chat closes
  }, []);

  return (
    <ChatContext.Provider value={{
      isOpen,
      openChat,
      closeChat,
      initialMessage,
      autoSend,
      completionId,
      clearMessageState,
      pageContext,
      setPageContext
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
