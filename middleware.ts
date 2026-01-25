import { NextRequest, NextResponse } from 'next/server';
import { matchLocale } from '@/i18n/config';

/**
 * Middleware for browser locale detection.
 * Sets NEXT_LOCALE cookie for unauthenticated users based on Accept-Language header.
 *
 * Note: This cookie is only set once on first visit. Authenticated users can change
 * their locale preference in Settings, which is stored in the database session.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sw.js') ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // Static files with extensions (.png, .ico, etc.)
  ) {
    return NextResponse.next();
  }

  // Check if locale cookie is already set
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale) {
    return NextResponse.next();
  }

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  const detectedLocale = matchLocale(acceptLanguage);

  // Set locale cookie for future requests
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', detectedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: [
    // Match all page routes (excludes api, _next, and files with extensions)
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*$).*)',
  ],
};
