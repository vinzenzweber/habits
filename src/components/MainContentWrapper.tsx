'use client';

import { ReactNode } from 'react';
import { useChat } from '@/contexts/ChatContext';

interface MainContentWrapperProps {
  children: ReactNode;
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  const { isOpen } = useChat();

  return (
    <div
      className={`transition-[margin] duration-300 ease-in-out ${
        isOpen ? 'md:mr-[400px]' : ''
      }`}
    >
      {children}
    </div>
  );
}
