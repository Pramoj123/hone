import { NextRequest, NextResponse } from "next/server";

const STAFF_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "BRANCH_MANAGER", "TRAINER"];
const PUBLIC_PATHS = ["/login", "/accept-invite"];

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  gymSlug: string | null;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  // A live refresh cookie also counts as "authenticated" — the token route
  // transparently mints a new access token from it on the next API call.
  const token =
    req.cookies.get("hone_admin_token")?.value ??
    req.cookies.get("hone_admin_refresh")?.value;
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (token) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  }

  const payload = decodeJwt(token);
  if (!payload || !STAFF_ROLES.includes(payload.role)) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("hone_admin_token");
    return res;
  }

  // Non-super-admins must stay within their gym slug
  if (payload.role !== "SUPER_ADMIN" && payload.gymSlug) {
    const inGymRoute = pathname.startsWith(`/${payload.gymSlug}/`);
    if (!inGymRoute) {
      return NextResponse.redirect(new URL(`/${payload.gymSlug}/dashboard`, req.url));
    }
  }

  // Super admin must stay in super-admin routes
  if (payload.role === "SUPER_ADMIN" && payload.gymSlug === null) {
    const SUPER_ADMIN_ROOTS = ["/dashboard", "/gyms", "/workouts", "/scheduler"];
    const allowed = SUPER_ADMIN_ROOTS.some((r) => pathname.startsWith(r));
    if (!allowed) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
