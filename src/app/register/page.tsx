'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { WorkoutPreviewMini } from "@/components/WorkoutPreviewMini";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
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
        setError("Registration successful, but login failed. Please try logging in.");
        setLoading(false);
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg p-8 max-w-md w-full space-y-6">
        <div>
          <p className="text-emerald-400 text-sm font-medium mb-1">Build your streak, transform your routine</p>
          <h1 className="text-2xl font-bold">Get Started</h1>
          <p className="text-slate-400 text-sm mt-2">7 unique workouts designed for every day of the week</p>
        </div>

        <WorkoutPreviewMini />

        {error && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label htmlFor="name" className="block text-sm mb-2">Name</label>
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
            <label htmlFor="email" className="block text-sm mb-2">Email</label>
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
            <label htmlFor="password" className="block text-sm mb-2">Password (min 8 characters)</label>
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
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center mt-4 text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
