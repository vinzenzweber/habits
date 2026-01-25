import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { defaultLocale, getBaseLocale, isValidLocale, type Locale } from './config';

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

  // Get base locale for loading messages (de-AT uses de-DE messages)
  const baseLocale = getBaseLocale(locale);

  // Load messages for the base locale
  const messages = (await import(`../../messages/${baseLocale}.json`)).default;

  return {
    locale,
    messages,
  };
});
