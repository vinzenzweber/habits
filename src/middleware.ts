import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Use NextAuth's auth() function which properly reads the session
  const session = await auth();
  const onboardingCookie = request.cookies.get("onboarding_complete");

  const { pathname } = request.nextUrl;

  // Allow access to auth routes
  if (pathname.startsWith("/api/auth") || pathname === "/login" || pathname === "/register" || pathname === "/logout") {
    return NextResponse.next();
  }

  // Check if onboarding is complete (from cookie or session)
  // Note: onboardingCompleted is stored in the JWT token, accessible via session
  const isOnboardingComplete = onboardingCookie?.value === "true";

  // Allow access to onboarding routes for authenticated users
  if (pathname === "/onboarding" || pathname.startsWith("/api/onboarding")) {
    // But redirect to home if already completed onboarding
    if (session?.user && isOnboardingComplete) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Allow access if authenticated but not completed
    if (session?.user) {
      return NextResponse.next();
    }
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to login if no session
  if (!session?.user) {
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
  // Only run middleware on app routes, excluding static files and auth
  matcher: [
    "/",
    "/workouts/:path*",
    "/onboarding",
    "/api/chat/:path*",
    "/api/speech/:path*",
    "/api/workouts/:path*",
    "/api/onboarding/:path*",
  ]
};
