'use client';
import { signIn } from "next-auth/react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { WorkoutPreviewMini } from "@/components/WorkoutPreviewMini";

type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

// Empty subscribe function - greeting only needs to be read once on mount
function subscribe() {
  return () => {};
}

// useSyncExternalStore hook to safely get time of day on client only
function useTimeOfDay(): TimeOfDay | null {
  return useSyncExternalStore(
    subscribe,
    getTimeOfDay, // Client: return actual time of day
    () => null // Server: return null to show fallback
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timeOfDay = useTimeOfDay();
  const router = useRouter();
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');

  // Get greeting based on time of day
  const greeting = timeOfDay ? t(`greetings.${timeOfDay}`) : t('readyForWorkout');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError(t('invalidCredentials'));
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(tErrors('generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg p-8 max-w-md w-full space-y-6">
        <div>
          <p className="text-emerald-400 text-sm font-medium mb-1">
            {greeting}
          </p>
          <h1 className="text-2xl font-bold">{t('welcomeBack')}</h1>
        </div>

        <WorkoutPreviewMini />

        {error && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
            <label htmlFor="password" className="block text-sm mb-2">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded font-medium transition disabled:opacity-50"
          >
            {loading ? t('loggingIn') : t('login')}
          </button>
        </form>

        <p className="text-center mt-4 text-slate-400">
          {t('noAccount')}{" "}
          <Link href="/register" className="text-emerald-400 hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
