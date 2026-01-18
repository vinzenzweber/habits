import { type UnitSystem } from "@/lib/user-preferences";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      timezone: string;
      locale: string;
      unitSystem: UnitSystem;
      onboardingCompleted?: boolean;
      defaultRecipeLocale: string | null;
      showMeasurementConversions: boolean;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    onboardingCompleted?: boolean;
    timezone?: string;
    locale?: string;
    unitSystem?: UnitSystem;
    defaultRecipeLocale?: string | null;
    showMeasurementConversions?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingCompleted?: boolean;
    timezone?: string;
    locale?: string;
    unitSystem?: UnitSystem;
    defaultRecipeLocale?: string | null;
    showMeasurementConversions?: boolean;
  }
}
