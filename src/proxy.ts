import { NextResponse, type NextRequest } from "next/server";
import { isProtectedRoute } from "@/lib/tenant";

const SESSION_COOKIE = "votewise_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Voter-facing ballot routes are public by identifier; allow them through.
  if (pathname.startsWith("/vote/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/results/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/observe/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/report/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Auth pages: if already logged in, redirect to dashboard
  if (
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname.startsWith("/reset-password")) &&
    token
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedRoute(pathname) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
