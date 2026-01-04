'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatOpenOptions {
  initialMessage?: string;
  autoSend?: boolean;
  completionId?: number;
}

interface ChatContextType {
  isOpen: boolean;
  openChat: (options?: ChatOpenOptions) => void;
  closeChat: () => void;
  initialMessage: string | null;
  autoSend: boolean;
  completionId: number | null;
  clearInitialState: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [autoSend, setAutoSend] = useState(false);
  const [completionId, setCompletionId] = useState<number | null>(null);

  const openChat = useCallback((options?: ChatOpenOptions) => {
    setInitialMessage(options?.initialMessage ?? null);
    setAutoSend(options?.autoSend ?? false);
    setCompletionId(options?.completionId ?? null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearInitialState = useCallback(() => {
    setInitialMessage(null);
    setAutoSend(false);
    // Keep completionId until chat closes for rating buttons
  }, []);

  return (
    <ChatContext.Provider value={{
      isOpen,
      openChat,
      closeChat,
      initialMessage,
      autoSend,
      completionId,
      clearInitialState
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
