import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        if (!user) return null;

        const valid = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!valid) return null;

        // Try to get onboarding status separately (column may not exist)
        let onboardingCompleted = false;
        try {
          const onboardingResult = await query(
            `SELECT onboarding_completed FROM users WHERE id = $1`,
            [user.id]
          );
          onboardingCompleted = onboardingResult.rows[0]?.onboarding_completed ?? false;
        } catch {
          // Column doesn't exist yet - assume not completed for new users
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          onboardingCompleted
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
});
