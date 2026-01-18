/**
 * User preferences for timezone, locale, and unit system
 */

export type UnitSystem = 'metric' | 'imperial';

export interface UserPreferences {
  timezone: string;
  locale: string;
  unitSystem: UnitSystem;
}

export interface RecipePreferences {
  defaultRecipeLocale: string | null;  // null = use general locale
  measurementSystem: UnitSystem;        // reuses existing unit system
  showMeasurementConversions: boolean;
  userRegionTimezone: string | null;    // null = auto-detect from timezone
}

export interface UserPreferencesWithRecipe extends UserPreferences {
  defaultRecipeLocale: string | null;
  showMeasurementConversions: boolean;
  userRegionTimezone: string | null;
}

// Timezone to region name mapping (for AI prompts)
// Maps timezone codes to human-readable region names for ingredient localization
export const TIMEZONE_TO_REGION: Record<string, string> = {
  'Europe/Vienna': 'Austria',
  'Europe/Berlin': 'Germany',
  'Europe/Zurich': 'Switzerland',
  'Europe/Paris': 'France',
  'Europe/Rome': 'Italy',
  'Europe/Madrid': 'Spain',
  'Europe/London': 'United Kingdom',
  'Europe/Amsterdam': 'Netherlands',
  'America/New_York': 'United States (East Coast)',
  'America/Los_Angeles': 'United States (West Coast)',
  'America/Chicago': 'United States (Midwest)',
  'America/Denver': 'United States (Mountain)',
  'Australia/Sydney': 'Australia',
  'Australia/Melbourne': 'Australia',
  'Asia/Tokyo': 'Japan',
  'Asia/Shanghai': 'China',
  'Asia/Singapore': 'Singapore',
  'Pacific/Auckland': 'New Zealand',
};

// Region options for dropdown selection (displayed as regions, stored as timezones)
export const REGION_OPTIONS = [
  { value: '', label: 'Auto-detect from browser' },
  { value: 'Europe/Vienna', label: 'Austria (Vienna)' },
  { value: 'Europe/Berlin', label: 'Germany (Berlin)' },
  { value: 'Europe/Zurich', label: 'Switzerland (Zurich)' },
  { value: 'Europe/Paris', label: 'France (Paris)' },
  { value: 'Europe/Rome', label: 'Italy (Rome)' },
  { value: 'Europe/Madrid', label: 'Spain (Madrid)' },
  { value: 'Europe/London', label: 'United Kingdom (London)' },
  { value: 'Europe/Amsterdam', label: 'Netherlands (Amsterdam)' },
  { value: 'America/New_York', label: 'United States (East Coast)' },
  { value: 'America/Los_Angeles', label: 'United States (West Coast)' },
  { value: 'America/Chicago', label: 'United States (Midwest)' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
] as const;

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

// Recipe locale options for dropdown selection
// These are the languages supported for AI-generated recipe content
export const RECIPE_LOCALE_OPTIONS = [
  { value: '', label: 'Use Language & Region setting' },
  { value: 'de-DE', label: 'German (Deutsch)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Español)' },
  { value: 'fr-FR', label: 'French (Français)' },
  { value: 'it-IT', label: 'Italian (Italiano)' },
] as const;

// Default preferences for new users
export const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: 'UTC',
  locale: 'en-US',
  unitSystem: 'metric',
};

// Default recipe-specific preferences
export const DEFAULT_RECIPE_PREFERENCES: RecipePreferences = {
  defaultRecipeLocale: null,  // inherit from general locale
  measurementSystem: 'metric',
  showMeasurementConversions: false,
  userRegionTimezone: null,   // auto-detect from timezone
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
 * Uses Intl.Locale for proper validation of all BCP 47 components
 * (language, script subtags like Hans/Hant, and region codes)
 */
export function isValidLocale(locale: string): boolean {
  if (!locale || typeof locale !== 'string') return false;
  try {
    // Intl.Locale will throw if the locale is invalid
    new Intl.Locale(locale);
    return true;
  } catch {
    return false;
  }
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
 * Validates if a recipe locale is valid (null, empty string, or valid BCP 47 locale)
 * Empty string or null means inherit from general locale
 */
export function isValidRecipeLocale(locale: string | null | undefined): boolean {
  // null or empty string means inherit from general locale
  if (locale === null || locale === undefined || locale === '') {
    return true;
  }
  // Otherwise validate as a regular locale
  return isValidLocale(locale);
}

/**
 * Determines unit system based on locale
 * US and a few other countries use imperial
 * Note: UK officially uses metric for weights and temperatures
 */
export function getDefaultUnitSystemForLocale(locale: string): UnitSystem {
  const imperialLocales = ['en-US', 'my-MM', 'lr-LR'];
  return imperialLocales.includes(locale) ? 'imperial' : 'metric';
}

/**
 * Get human-readable region name from timezone
 * Used for AI prompts - never expose timezone codes to AI
 */
export function getRegionFromTimezone(timezone: string): string {
  return TIMEZONE_TO_REGION[timezone] || extractRegionFromTimezone(timezone);
}

/**
 * Extract a reasonable region name from a timezone code
 * Fallback for timezones not in our mapping
 */
function extractRegionFromTimezone(timezone: string): string {
  // Extract city from format "Continent/City" or "Continent/Region/City"
  const parts = timezone.split('/');
  if (parts.length >= 2) {
    // Get the last part (city) and replace underscores with spaces
    return parts[parts.length - 1].replace(/_/g, ' ');
  }
  return 'Unknown Region';
}
