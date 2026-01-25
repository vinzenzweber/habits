/**
 * Locale configuration for internationalization.
 */

export const locales = ['en-US', 'de-DE', 'de-AT', 'es-ES', 'es-CO'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en-US';

/**
 * Mapping from locale variants to their base translation locale.
 * de-AT and es-CO use base translations with locale-specific formatting via Intl APIs.
 */
export const localeBaseMap: Record<string, string> = {
  'de-AT': 'de-DE',
  'es-CO': 'es-ES',
};

/**
 * Get the base translation locale for a given locale.
 * Used to share translations between regional variants.
 */
export function getBaseLocale(locale: string): string {
  return localeBaseMap[locale] ?? locale;
}

/**
 * Check if a locale is supported.
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Default locale for each language family.
 * Used when Accept-Language contains only a language code (e.g., "de" -> "de-DE").
 */
export const languageDefaultLocale: Record<string, Locale> = {
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
};

/**
 * Get the best matching locale from Accept-Language header.
 */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header
  const requested = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, q = 'q=1'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 1;
      return { locale: locale.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of requested) {
    // Check exact match
    if (isValidLocale(locale)) {
      return locale;
    }

    // Check language-only match using explicit mapping (e.g., "de" -> "de-DE")
    const language = locale.split('-')[0];
    const defaultForLanguage = languageDefaultLocale[language];
    if (defaultForLanguage) {
      return defaultForLanguage;
    }
  }

  return defaultLocale;
}
