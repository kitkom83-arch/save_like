import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSession } from "@/lib/auth";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "@/lib/i18n/config";

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) {
    return null;
  }

  const normalized = header.toLowerCase();
  if (normalized.includes("th")) {
    return "th";
  }

  if (normalized.includes("en")) {
    return "en";
  }

  return null;
}

function detectLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLocale = parseAcceptLanguage(request.headers.get("accept-language"));
  if (acceptLocale) {
    return acceptLocale;
  }

  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];
  const localeFromPath = isLocale(first) ? first : null;
  const normalizedPath = localeFromPath
    ? `/${parts.slice(1).join("/")}`.replace(/\/+$/, "") || "/"
    : pathname;
  const locale = localeFromPath ?? detectLocale(request);

  const isProtectedDashboardRoute =
    normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard/");
  const isProtectedApiRoute =
    normalizedPath === "/api/links" ||
    normalizedPath.startsWith("/api/links/") ||
    normalizedPath === "/api/health-check/run";
  const isAuthApiRoute =
    normalizedPath === "/api/auth/login" || normalizedPath === "/api/auth/logout";
  const isLoginRoute = normalizedPath === "/login";

  const session = request.cookies.get(adminSessionCookieName)?.value;
  const isAuthorized = await verifyAdminSession(session);

  if (isProtectedApiRoute && !isAuthApiRoute && !isAuthorized) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    );
  }

  if (isProtectedDashboardRoute && !isAuthorized) {
    const loginPath = `/${locale}/login`;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (isLoginRoute && isAuthorized) {
    const dashboardPath = `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  if (localeFromPath) {
    const rewritten = request.nextUrl.clone();
    const rest = parts.slice(1).join("/");
    rewritten.pathname = rest ? `/${rest}` : "/";

    const response = NextResponse.rewrite(rewritten);
    response.cookies.set(localeCookieName, localeFromPath, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return response;
  }

  if (pathname === "/") {
    const response = NextResponse.redirect(new URL(`/${locale}`, request.url));
    response.cookies.set(localeCookieName, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
