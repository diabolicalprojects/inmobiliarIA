import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = [
  "/login",
  "/register",
  "/api/auth",
  "/api/v1/webhooks",
];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static assets and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasSessionCookie = req.cookies
    .getAll()
    .some((cookie) => /(?:^|\.)(?:authjs|next-auth)\.session-token$/.test(cookie.name));

  // Check auth for dashboard routes
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
