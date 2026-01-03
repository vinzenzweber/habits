'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear session and redirect
    fetch('/api/auth/signout', {
      method: 'POST',
    }).then(() => {
      // Clear all auth cookies
      document.cookie = 'authjs.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = '__Secure-authjs.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 500);
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-lg">Logging out...</p>
      </div>
    </div>
  );
}
