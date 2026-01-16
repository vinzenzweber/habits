'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Only show on these exact paths
const VISIBLE_PATHS = ['/', '/recipes'];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on all pages except main list pages
  if (!VISIBLE_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-full items-center justify-around max-w-3xl mx-auto">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 px-6 py-2 ${
            pathname === '/' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {/* Home icon */}
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">Home</span>
        </Link>

        <Link
          href="/recipes"
          className={`flex flex-col items-center justify-center gap-1 px-6 py-2 ${
            pathname === '/recipes' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {/* Recipes icon (utensils) */}
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs font-medium">Recipes</span>
        </Link>
      </div>
    </nav>
  );
}
