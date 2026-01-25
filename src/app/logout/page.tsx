'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export default function LogoutPage() {
  const t = useTranslations('auth');

  useEffect(() => {
    // Clear onboarding cookie to prevent stale state for next user
    document.cookie = 'onboarding_complete=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Use NextAuth's signOut for proper session cleanup
    signOut({ callbackUrl: '/login' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-lg">{t('loggingOut')}</p>
      </div>
    </div>
  );
}
