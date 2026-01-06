import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  // Get JWT token - NextAuth v5 uses authjs.session-token cookie
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token"
  });
  const onboardingCookie = request.cookies.get("onboarding_complete");

  const { pathname } = request.nextUrl;

  // Allow access to auth routes and test routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/test") || pathname === "/login" || pathname === "/register" || pathname === "/logout") {
    return NextResponse.next();
  }

  // Check if onboarding is complete (from cookie or JWT)
  const isOnboardingComplete = onboardingCookie?.value === "true" || token?.onboardingCompleted === true;

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
