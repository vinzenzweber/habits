'use client';

import { OnboardingChat } from '@/components/OnboardingChat';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function OnboardingClient() {
  const router = useRouter();

  const handleComplete = useCallback(() => {
    // Set cookie to mark onboarding as complete
    document.cookie = 'onboarding_complete=true; path=/; max-age=31536000; SameSite=Lax';
    // Redirect to home
    router.push('/');
    router.refresh();
  }, [router]);

  return <OnboardingChat onComplete={handleComplete} />;
}
