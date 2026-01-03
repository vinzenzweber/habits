import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("authjs.session-token") || request.cookies.get("__Secure-authjs.session-token");

  const { pathname } = request.nextUrl;

  // Allow access to auth routes
  if (pathname.startsWith("/api/auth") || pathname === "/login" || pathname === "/register" || pathname === "/logout") {
    return NextResponse.next();
  }

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|register|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.webp$|.*\\.jpg$|.*\\.jpeg$|.*\\.mp3$).*)"]
};
