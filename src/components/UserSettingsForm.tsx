'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  type UserPreferencesWithRecipe,
  type UnitSystem,
  COMMON_TIMEZONES,
  SUPPORTED_LOCALES,
  UNIT_SYSTEMS,
  RECIPE_LOCALE_OPTIONS,
  REGION_OPTIONS,
  getRegionFromTimezone,
} from '@/lib/user-preferences';

interface UserSettingsFormProps {
  initialPreferences: UserPreferencesWithRecipe;
  userName?: string;
  userEmail?: string;
}

export function UserSettingsForm({
  initialPreferences,
  userName,
  userEmail,
}: UserSettingsFormProps) {
  const router = useRouter();
  const t = useTranslations('settings');
  const [timezone, setTimezone] = useState(initialPreferences.timezone);
  const [locale, setLocale] = useState(initialPreferences.locale);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialPreferences.unitSystem);
  const [defaultRecipeLocale, setDefaultRecipeLocale] = useState(initialPreferences.defaultRecipeLocale ?? '');
  const [showMeasurementConversions, setShowMeasurementConversions] = useState(initialPreferences.showMeasurementConversions);
  const [userRegionTimezone, setUserRegionTimezone] = useState(initialPreferences.userRegionTimezone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          locale,
          unitSystem,
          defaultRecipeLocale,
          showMeasurementConversions,
          userRegionTimezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save preferences');
        return;
      }

      setSuccess(true);
      // Refresh to update server components with new session data
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check if the current timezone is in the common list
  const isCustomTimezone = !COMMON_TIMEZONES.some(tz => tz.value === timezone);
  // Check if the current locale is in the supported list
  const isCustomLocale = !SUPPORTED_LOCALES.some(l => l.value === locale);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Section */}
      <section className="bg-slate-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('account')}</h2>
        <div className="space-y-3">
          {userName && (
            <div>
              <span className="text-slate-400 text-sm">{t('accountName')}</span>
              <p className="text-slate-100">{userName}</p>
            </div>
          )}
          {userEmail && (
            <div>
              <span className="text-slate-400 text-sm">{t('accountEmail')}</span>
              <p className="text-slate-100">{userEmail}</p>
            </div>
          )}
        </div>
      </section>

      {/* Preferences Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 rounded-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold">{t('preferences')}</h2>

        {error && (
          <div role="alert" className="bg-red-500/20 text-red-200 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="bg-emerald-500/20 text-emerald-200 p-3 rounded text-sm">
            {t('preferencesSaved')}
          </div>
        )}

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm mb-2 text-slate-300">
            {t('timezone')}
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={saving}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 text-slate-100"
          >
            {isCustomTimezone && (
              <option value={timezone}>{timezone}</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-slate-500 text-xs mt-1">
            {t('timezoneDescription')}
          </p>
        </div>

        {/* Locale */}
        <div>
          <label htmlFor="locale" className="block text-sm mb-2 text-slate-300">
            {t('languageRegion')}
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            disabled={saving}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 text-slate-100"
          >
            {isCustomLocale && (
              <option value={locale}>{locale}</option>
            )}
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="text-slate-500 text-xs mt-1">
            {t('languageRegionDescription')}
          </p>
        </div>

        {/* Unit System */}
        <div>
          <label htmlFor="unitSystem" className="block text-sm mb-2 text-slate-300">
            {t('unitSystem')}
          </label>
          <select
            id="unitSystem"
            value={unitSystem}
            onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
            disabled={saving}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 text-slate-100"
          >
            {UNIT_SYSTEMS.map((us) => (
              <option key={us.value} value={us.value}>
                {us.label}
              </option>
            ))}
          </select>
          <p className="text-slate-500 text-xs mt-1">
            {t('unitSystemDescription')}
          </p>
        </div>

        {/* Recipe Preferences Section */}
        <div className="border-t border-slate-700 pt-5 mt-5">
          <h3 className="text-md font-semibold mb-4 text-slate-200">{t('recipePreferences')}</h3>

          {/* Default Recipe Language */}
          <div className="mb-4">
            <label htmlFor="defaultRecipeLocale" className="block text-sm mb-2 text-slate-300">
              {t('defaultRecipeLanguage')}
            </label>
            <select
              id="defaultRecipeLocale"
              value={defaultRecipeLocale}
              onChange={(e) => setDefaultRecipeLocale(e.target.value)}
              disabled={saving}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 text-slate-100"
            >
              {RECIPE_LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-slate-500 text-xs mt-1">
              {t('defaultRecipeLanguageDescription')}
            </p>
          </div>

          {/* Ingredient Region */}
          <div className="mb-4">
            <label htmlFor="userRegionTimezone" className="block text-sm mb-2 text-slate-300">
              {t('ingredientRegion')}
            </label>
            <div className="flex gap-2">
              <select
                id="userRegionTimezone"
                value={userRegionTimezone}
                onChange={(e) => setUserRegionTimezone(e.target.value)}
                disabled={saving}
                className="flex-1 p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 text-slate-100"
              >
                {REGION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {/* Show custom timezone if not in predefined list */}
                {userRegionTimezone && !REGION_OPTIONS.some(r => r.value === userRegionTimezone) && (
                  <option value={userRegionTimezone}>
                    {getRegionFromTimezone(userRegionTimezone)}
                  </option>
                )}
              </select>
              <button
                type="button"
                onClick={() => {
                  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  setUserRegionTimezone(detected);
                }}
                disabled={saving}
                className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm disabled:opacity-50"
              >
                {t('detect')}
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              {t('ingredientRegionDescription')}
            </p>
          </div>

          {/* Show Measurement Conversions */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="showMeasurementConversions"
              checked={showMeasurementConversions}
              onChange={(e) => setShowMeasurementConversions(e.target.checked)}
              disabled={saving}
              className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <div>
              <label htmlFor="showMeasurementConversions" className="block text-sm text-slate-300">
                {t('showMeasurementConversions')}
              </label>
              <p className="text-slate-500 text-xs mt-1">
                {t('showMeasurementConversionsDescription')}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded font-medium transition disabled:opacity-50"
        >
          {saving ? t('savingPreferences') : t('savePreferences')}
        </button>
      </form>

      {/* Logout Section */}
      <section className="bg-slate-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('session')}</h2>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-slate-800 hover:bg-slate-700 text-red-400 py-3 rounded font-medium transition disabled:opacity-50"
        >
          {loggingOut ? t('loggingOut') : t('logOut')}
        </button>
      </section>
    </div>
  );
}
