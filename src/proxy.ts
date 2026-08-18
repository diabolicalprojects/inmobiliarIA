import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: proxy } = NextAuth(authConfig);

const publicPaths = [
  "/login",
  "/register",
  "/api/auth",
  "/api/v1/webhooks",
];

export default proxy((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return;
  }

  // Allow static assets and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return;
  }

  // Check auth for dashboard routes
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
