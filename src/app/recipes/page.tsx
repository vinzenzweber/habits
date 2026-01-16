import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
            FitStreak
          </p>
        </header>

        <section className="space-y-4">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Recipes
          </h1>
          <p className="text-slate-400">
            Your healthy recipes will appear here.
          </p>
        </section>
      </div>
    </main>
  );
}
