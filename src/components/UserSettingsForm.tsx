'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type UserPreferences,
  type UnitSystem,
  COMMON_TIMEZONES,
  SUPPORTED_LOCALES,
  UNIT_SYSTEMS,
} from '@/lib/user-preferences';

interface UserSettingsFormProps {
  initialPreferences: UserPreferences;
  userName?: string;
  userEmail?: string;
}

export function UserSettingsForm({
  initialPreferences,
  userName,
  userEmail,
}: UserSettingsFormProps) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(initialPreferences.timezone);
  const [locale, setLocale] = useState(initialPreferences.locale);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialPreferences.unitSystem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, locale, unitSystem }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save preferences');
        return;
      }

      setSuccess(true);
      // Refresh to update session with new preferences
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

  return (
    <div className="space-y-6">
      {/* User Info Section */}
      <section className="bg-slate-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="space-y-3">
          {userName && (
            <div>
              <span className="text-slate-400 text-sm">Name</span>
              <p className="text-slate-100">{userName}</p>
            </div>
          )}
          {userEmail && (
            <div>
              <span className="text-slate-400 text-sm">Email</span>
              <p className="text-slate-100">{userEmail}</p>
            </div>
          )}
        </div>
      </section>

      {/* Preferences Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 rounded-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold">Preferences</h2>

        {error && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/20 text-emerald-200 p-3 rounded text-sm">
            Preferences saved successfully
          </div>
        )}

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm mb-2 text-slate-300">
            Timezone
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
            Used for displaying dates and scheduling
          </p>
        </div>

        {/* Locale */}
        <div>
          <label htmlFor="locale" className="block text-sm mb-2 text-slate-300">
            Language &amp; Region
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
            Used for number and date formatting
          </p>
        </div>

        {/* Unit System */}
        <div>
          <label htmlFor="unitSystem" className="block text-sm mb-2 text-slate-300">
            Unit System
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
            Used for weights, measurements, and temperatures
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded font-medium transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}
