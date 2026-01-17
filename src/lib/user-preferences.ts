/**
 * User preferences for timezone, locale, and unit system
 */

export type UnitSystem = 'metric' | 'imperial';

export interface UserPreferences {
  timezone: string;
  locale: string;
  unitSystem: UnitSystem;
}

// Common timezones for dropdown selection
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/Madrid', label: 'Madrid (Spain)' },
  { value: 'Europe/Rome', label: 'Rome (Italy)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (Netherlands)' },
  { value: 'Europe/Vienna', label: 'Vienna (Austria)' },
  { value: 'Europe/Zurich', label: 'Zurich (Switzerland)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (China)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Dubai', label: 'Dubai (UAE)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (Australia)' },
  { value: 'Pacific/Auckland', label: 'Auckland (New Zealand)' },
] as const;

// Supported locales for dropdown selection
export const SUPPORTED_LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'de-AT', label: 'Deutsch (Österreich)' },
  { value: 'de-CH', label: 'Deutsch (Schweiz)' },
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'it-IT', label: 'Italiano (Italia)' },
  { value: 'nl-NL', label: 'Nederlands (Nederland)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ja-JP', label: '日本語 (日本)' },
  { value: 'zh-CN', label: '简体中文 (中国)' },
] as const;

// Unit system options for dropdown selection
export const UNIT_SYSTEMS = [
  { value: 'metric' as const, label: 'Metric (kg, cm, °C)' },
  { value: 'imperial' as const, label: 'Imperial (lbs, in, °F)' },
] as const;

// Default preferences for new users
export const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: 'UTC',
  locale: 'en-US',
  unitSystem: 'metric',
};

/**
 * Validates if a timezone string is likely valid
 * Uses Intl.supportedValuesOf if available, otherwise allows any non-empty string
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') return false;
  try {
    // Try to create a DateTimeFormat with this timezone
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a locale string is in valid BCP 47 format
 */
export function isValidLocale(locale: string): boolean {
  if (!locale || typeof locale !== 'string') return false;
  // Basic BCP 47 format: language[-region]
  const bcp47Pattern = /^[a-z]{2,3}(-[A-Z]{2})?$/i;
  return bcp47Pattern.test(locale);
}

/**
 * Validates if a unit system is valid
 */
export function isValidUnitSystem(unitSystem: string): unitSystem is UnitSystem {
  return unitSystem === 'metric' || unitSystem === 'imperial';
}

/**
 * Validates a full UserPreferences object
 */
export function isValidUserPreferences(prefs: unknown): prefs is UserPreferences {
  if (!prefs || typeof prefs !== 'object') return false;
  const p = prefs as Record<string, unknown>;
  return (
    isValidTimezone(p.timezone as string) &&
    isValidLocale(p.locale as string) &&
    isValidUnitSystem(p.unitSystem as string)
  );
}

/**
 * Determines unit system based on locale
 * US, UK, and a few other countries use imperial
 */
export function getDefaultUnitSystemForLocale(locale: string): UnitSystem {
  const imperialLocales = ['en-US', 'en-GB', 'my-MM', 'lr-LR'];
  return imperialLocales.includes(locale) ? 'imperial' : 'metric';
}
