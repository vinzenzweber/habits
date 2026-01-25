import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { defaultLocale, isValidLocale, type Locale } from './config';

/**
 * Request-time configuration for next-intl.
 * Resolves locale from session (authenticated) or cookie (unauthenticated).
 */
export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;

  // Try to get locale from authenticated session first
  const session = await auth();
  if (session?.user?.locale && isValidLocale(session.user.locale)) {
    locale = session.user.locale;
  } else {
    // Fall back to NEXT_LOCALE cookie for unauthenticated users
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    if (cookieLocale && isValidLocale(cookieLocale)) {
      locale = cookieLocale;
    }
  }

  // Load messages for the locale
  const messages = await (async () => {
    switch (locale) {
      case 'de-DE':
        return (await import('../../messages/de-DE.json')).default;
      case 'de-AT':
        return (await import('../../messages/de-AT.json')).default;
      case 'es-ES':
        return (await import('../../messages/es-ES.json')).default;
      case 'es-CO':
        return (await import('../../messages/es-CO.json')).default;
      default:
        return (await import('../../messages/en-US.json')).default;
    }
  })();

  return {
    locale,
    messages,
  };
});
