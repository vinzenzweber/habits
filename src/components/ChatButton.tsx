'use client';

import { usePathname } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { ChatModal } from './ChatModal';

export function ChatButton() {
  const pathname = usePathname();
  const {
    isOpen,
    openChat,
    closeChat,
    initialMessage,
    autoSend,
    completionId,
    clearMessageState,
    pageContext
  } = useChat();

  // Don't show the chat button on auth pages
  const AUTH_PAGES = ['/login', '/register', '/onboarding'];
  if (AUTH_PAGES.includes(pathname)) {
    return null;
  }

  return (
    <>
      {/* Hide button on desktop when sidebar is open */}
      <button
        onClick={() => openChat()}
        className={`fixed bottom-20 right-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-50 transition ${
          isOpen ? 'md:hidden' : ''
        }`}
        aria-label="FitStreak AI"
      >
        <span className="text-2xl">💬</span>
      </button>
      <ChatModal
        isOpen={isOpen}
        onClose={closeChat}
        initialMessage={initialMessage}
        autoSend={autoSend}
        completionId={completionId}
        onInitialStateConsumed={clearMessageState}
        pageContext={pageContext ?? undefined}
      />
    </>
  );
}
