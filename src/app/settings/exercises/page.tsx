import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getAllExercisesForManagement } from "@/lib/exercise-library";
import { ExerciseDescriptionsManager } from "@/components/ExerciseDescriptionsManager";

export default async function ExercisesSettingsPage() {
  const [session, t] = await Promise.all([
    auth(),
    getTranslations('exercises'),
  ]);

  if (!session?.user) {
    redirect("/login");
  }

  const exercises = await getAllExercisesForManagement();

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </header>

        <ExerciseDescriptionsManager initialExercises={exercises} />
      </div>
    </div>
  );
}
