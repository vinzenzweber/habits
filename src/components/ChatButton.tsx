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

  // Don't show the chat button on the onboarding page (it has its own chat)
  if (pathname === '/onboarding') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => openChat()}
        className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-40 transition"
        aria-label="Personal Trainer"
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
