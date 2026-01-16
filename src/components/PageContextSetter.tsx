'use client';

import { useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';

interface PageContextSetterProps {
  page: string;
  workoutSlug?: string;
  workoutTitle?: string;
  recipeSlug?: string;
  recipeTitle?: string;
}

export function PageContextSetter({ page, workoutSlug, workoutTitle, recipeSlug, recipeTitle }: PageContextSetterProps) {
  const { setPageContext } = useChat();

  useEffect(() => {
    setPageContext({ page, workoutSlug, workoutTitle, recipeSlug, recipeTitle });

    // Clear context when unmounting
    return () => {
      setPageContext(null);
    };
  }, [page, workoutSlug, workoutTitle, recipeSlug, recipeTitle, setPageContext]);

  return null;
}
