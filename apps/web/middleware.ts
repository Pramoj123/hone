import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/accept-invite"];
// Always accessible regardless of auth state — needs the token query param to do its job
const ALWAYS_PUBLIC_PATHS = ["/verify-email"];

export function middleware(req: NextRequest) {
  // A live refresh cookie also counts as "authenticated" — the token route
  // transparently mints a new access token from it on the next API call.
  const token =
    req.cookies.get("hone_token")?.value ?? req.cookies.get("hone_refresh")?.value;
  const { pathname } = req.nextUrl;

  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (token) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
