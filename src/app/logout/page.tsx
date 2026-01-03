'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function LogoutPage() {
  useEffect(() => {
    // Use NextAuth's signOut for proper session cleanup
    signOut({ callbackUrl: '/login' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-lg">Logging out...</p>
      </div>
    </div>
  );
}
