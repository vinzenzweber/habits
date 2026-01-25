'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations('auth');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-slate-400 hover:text-white transition"
    >
      {t('logout')}
    </button>
  );
}
