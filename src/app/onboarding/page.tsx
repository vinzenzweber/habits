import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { OnboardingClient } from './OnboardingClient';

export default async function OnboardingPage() {
  // Server-side auth check - ensures unauthenticated users can't see this page
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user already completed onboarding
  const cookieStore = await cookies();
  const onboardingCookie = cookieStore.get('onboarding_complete');
  const isComplete = onboardingCookie?.value === 'true';

  if (isComplete) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <OnboardingClient />
    </main>
  );
}
