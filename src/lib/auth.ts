import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "./db";
import { type UnitSystem } from "./user-preferences";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  trustHost: true, // Required for Railway/reverse proxy deployments
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Query without onboarding_completed first (backward compatible)
        const result = await query(`
          SELECT id, email, name, password_hash
          FROM users WHERE email = $1
        `, [email]);

        const user = result.rows[0];
        if (!user) {
          console.warn('[auth] User not found', { email });
          return null;
        }

        const valid = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!valid) {
          console.warn('[auth] Invalid password', { email });
          return null;
        }

        // Try to get onboarding status and preferences separately (columns may not exist)
        let onboardingCompleted = false;
        let timezone = 'UTC';
        let locale = 'en-US';
        let unitSystem: UnitSystem = 'metric';
        let defaultRecipeLocale: string | null = null;
        let showMeasurementConversions = false;
        let userRegionTimezone: string | null = null;
        try {
          const extendedResult = await query(
            `SELECT onboarding_completed, timezone, locale, unit_system, default_recipe_locale, show_measurement_conversions, user_region_timezone FROM users WHERE id = $1`,
            [user.id]
          );
          const row = extendedResult.rows[0];
          onboardingCompleted = row?.onboarding_completed ?? false;
          timezone = row?.timezone ?? 'UTC';
          locale = row?.locale ?? 'en-US';
          unitSystem = (row?.unit_system as UnitSystem) ?? 'metric';
          defaultRecipeLocale = row?.default_recipe_locale ?? null;
          showMeasurementConversions = row?.show_measurement_conversions ?? false;
          userRegionTimezone = row?.user_region_timezone ?? null;
        } catch {
          // Columns don't exist yet - use defaults
        }

        console.log('[auth] Login successful', { userId: user.id, email: user.email });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          onboardingCompleted,
          timezone,
          locale,
          unitSystem,
          defaultRecipeLocale,
          showMeasurementConversions,
          userRegionTimezone
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days for PWA
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial login - populate token from user object
      if (user) {
        console.log('[auth:jwt] Initial login - populating token', { userId: user.id });
        token.id = user.id;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
        token.timezone = (user as { timezone?: string }).timezone ?? 'UTC';
        token.locale = (user as { locale?: string }).locale ?? 'en-US';
        token.unitSystem = (user as { unitSystem?: UnitSystem }).unitSystem ?? 'metric';
        token.defaultRecipeLocale = (user as { defaultRecipeLocale?: string | null }).defaultRecipeLocale ?? null;
        token.showMeasurementConversions = (user as { showMeasurementConversions?: boolean }).showMeasurementConversions ?? false;
        token.userRegionTimezone = (user as { userRegionTimezone?: string | null }).userRegionTimezone ?? null;
      }

      // Session update triggered - merge new preferences into token
      // Only update specific preference fields (security: prevent arbitrary token modification)
      if (trigger === "update" && session?.user) {
        console.log('[auth:jwt] Session update triggered', { userId: token.id });
        const userData = session.user as { timezone?: string; locale?: string; unitSystem?: UnitSystem; onboardingCompleted?: boolean; defaultRecipeLocale?: string | null; showMeasurementConversions?: boolean; userRegionTimezone?: string | null };
        if (userData.timezone !== undefined) {
          token.timezone = userData.timezone;
        }
        if (userData.locale !== undefined) {
          token.locale = userData.locale;
        }
        if (userData.unitSystem !== undefined) {
          token.unitSystem = userData.unitSystem;
        }
        if (userData.onboardingCompleted !== undefined) {
          token.onboardingCompleted = userData.onboardingCompleted;
        }
        if (userData.defaultRecipeLocale !== undefined) {
          token.defaultRecipeLocale = userData.defaultRecipeLocale;
        }
        if (userData.showMeasurementConversions !== undefined) {
          token.showMeasurementConversions = userData.showMeasurementConversions;
        }
        if (userData.userRegionTimezone !== undefined) {
          token.userRegionTimezone = userData.userRegionTimezone;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.timezone = token.timezone as string;
        session.user.locale = token.locale as string;
        session.user.unitSystem = token.unitSystem as UnitSystem;
        session.user.defaultRecipeLocale = (token.defaultRecipeLocale as string | null) ?? null;
        session.user.showMeasurementConversions = (token.showMeasurementConversions as boolean) ?? false;
        session.user.userRegionTimezone = (token.userRegionTimezone as string | null) ?? null;
      }
      return session;
    }
  }
});
