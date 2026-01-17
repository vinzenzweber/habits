'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Only show on main list pages (home, recipes, and settings)
// Note: Auth pages (/login, /register, /onboarding) are already excluded
// because they're not in VISIBLE_PATHS, but this is documented here for clarity
const VISIBLE_PATHS = ['/', '/recipes', '/settings'];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on all pages except main list pages
  if (!VISIBLE_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-full items-center justify-evenly max-w-3xl mx-auto px-4">
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

        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center gap-1 px-6 py-2 ${
            pathname === '/settings' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {/* Settings icon (gear/cog) */}
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
