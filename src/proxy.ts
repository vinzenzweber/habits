import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  // Get JWT token - NextAuth v5 uses authjs.session-token cookie
  // In production over HTTPS, use __Secure- prefix; otherwise use plain cookie name
  // This allows E2E tests to run over HTTP in CI while still being secure in production
  const isSecureContext = request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: isSecureContext
      ? "__Secure-authjs.session-token"
      : "authjs.session-token"
  });
  const onboardingCookie = request.cookies.get("onboarding_complete");

  const { pathname } = request.nextUrl;

  // Allow access to auth routes and test routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/test") || pathname === "/login" || pathname === "/register" || pathname === "/logout") {
    return NextResponse.next();
  }

  // Check if onboarding is complete
  // JWT token is set at login, but onboarding completion happens after login
  // So we need to check BOTH: JWT (for users who completed before) OR cookie (for users who just completed)
  const isOnboardingComplete = token?.onboardingCompleted === true || onboardingCookie?.value === "true";

  // Allow access to onboarding routes for authenticated users
  if (pathname === "/onboarding" || pathname.startsWith("/api/onboarding")) {
    // But redirect to home if already completed onboarding
    if (token && isOnboardingComplete) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Allow access if authenticated but not completed
    if (token) {
      return NextResponse.next();
    }
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to onboarding if not completed
  if (!isOnboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run proxy on app routes, excluding static files and auth
  matcher: [
    "/",
    "/workouts/:path*",
    "/onboarding",
    "/api/chat/:path*",
    "/api/speech/:path*",
    "/api/workouts/:path*",
    "/api/onboarding/:path*",
    "/api/test/:path*",
  ]
};
