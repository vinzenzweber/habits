'use client';

import { useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';

interface PageContextSetterProps {
  page: string;
  workoutSlug?: string;
  workoutTitle?: string;
}

export function PageContextSetter({ page, workoutSlug, workoutTitle }: PageContextSetterProps) {
  const { setPageContext } = useChat();

  useEffect(() => {
    setPageContext({ page, workoutSlug, workoutTitle });

    // Clear context when unmounting
    return () => {
      setPageContext(null);
    };
  }, [page, workoutSlug, workoutTitle, setPageContext]);

  return null;
}
