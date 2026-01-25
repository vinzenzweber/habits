import { NextRequest, NextResponse } from 'next/server';
import { matchLocale } from '@/i18n/config';

/**
 * Middleware for browser locale detection.
 * Sets NEXT_LOCALE cookie for unauthenticated users based on Accept-Language header.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sw.js') ||
    pathname.includes('.') // Static files like .png, .ico, etc.
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
    // Match all paths except static files and api routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
