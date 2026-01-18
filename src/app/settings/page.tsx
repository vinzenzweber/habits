import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserSettingsForm } from "@/components/UserSettingsForm";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Customize your app preferences</p>
        </header>

        <UserSettingsForm
          initialPreferences={{
            timezone: session.user.timezone,
            locale: session.user.locale,
            unitSystem: session.user.unitSystem,
            defaultRecipeLocale: session.user.defaultRecipeLocale,
            showMeasurementConversions: session.user.showMeasurementConversions,
          }}
          userName={session.user.name ?? undefined}
          userEmail={session.user.email ?? undefined}
        />
      </div>
    </div>
  );
}
