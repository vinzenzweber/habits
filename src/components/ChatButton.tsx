'use client';
import { useState } from 'react';
import { ChatModal } from './ChatModal';

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-40 transition"
        aria-label="Personal Trainer"
      >
        <span className="text-2xl">💬</span>
      </button>
      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
