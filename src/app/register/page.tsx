'use client';
import { useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { WorkoutPreviewMini } from "@/components/WorkoutPreviewMini";
import { getDefaultUnitSystemForLocale, type UnitSystem } from "@/lib/user-preferences";

// Default preferences used during SSR
const DEFAULT_BROWSER_PREFS = { timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' as UnitSystem };

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');

  // Browser preferences stored in ref (doesn't need to trigger re-renders, only read on submit)
  const browserPrefs = useRef(DEFAULT_BROWSER_PREFS);

  // Detect browser preferences after mount (client-side only, before paint)
  useLayoutEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const locale = navigator.language || 'en-US';
      const unitSystem = getDefaultUnitSystemForLocale(locale);
      browserPrefs.current = { timezone, locale, unitSystem };
    } catch {
      // Keep default preferences on error
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          timezone: browserPrefs.current.timezone,
          locale: browserPrefs.current.locale,
          unitSystem: browserPrefs.current.unitSystem,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('registrationFailed'));
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError(t('registrationSuccessLoginFailed'));
        setLoading(false);
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      setError(tErrors('generic'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg p-8 max-w-md w-full space-y-6">
        <div>
          <p className="text-emerald-400 text-sm font-medium mb-1">{t('buildYourStreak')}</p>
          <h1 className="text-2xl font-bold">{t('getStarted')}</h1>
          <p className="text-slate-400 text-sm mt-2">{t('sevenUniqueWorkouts')}</p>
        </div>

        <WorkoutPreviewMini />

        {error && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label htmlFor="name" className="block text-sm mb-2">{t('name')}</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={255}
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm mb-2">{t('email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-2">{t('passwordMinLength')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded font-medium transition disabled:opacity-50"
          >
            {loading ? t('creatingAccount') : t('register')}
          </button>
        </form>

        <p className="text-center mt-4 text-slate-400">
          {t('hasAccount')}{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
