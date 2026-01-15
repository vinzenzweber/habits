import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { OnboardingClient } from './OnboardingClient';

export default async function OnboardingPage() {
  // Server-side auth check - ensures unauthenticated users can't see this page
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user already completed onboarding (database is authoritative)
  const result = await query<{ onboarding_completed: boolean }>(
    `SELECT onboarding_completed FROM users WHERE id = $1`,
    [session.user.id]
  );
  const isComplete = result.rows[0]?.onboarding_completed === true;

  if (isComplete) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <OnboardingClient />
    </main>
  );
}
