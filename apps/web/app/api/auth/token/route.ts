import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  // ?force=1 mints a fresh access token even if the current one is still valid —
  // used after membership changes so stale JWT claims (e.g. gymSlug) self-heal
  const force = req.nextUrl.searchParams.get("force") === "1";
  const token = jar.get("hone_token")?.value ?? null;
  if (token && !force) return NextResponse.json({ token });

  // Access token expired/missing — try minting a new one from the refresh token
  const refreshToken = jar.get("hone_refresh")?.value;
  if (!refreshToken) return NextResponse.json({ token });

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("refresh failed");
    const data = (await res.json()) as RefreshResponse;

    const secure = process.env.NODE_ENV === "production";
    jar.set("hone_token", data.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
    jar.set("hone_refresh", data.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ token: data.access_token });
  } catch {
    jar.delete("hone_token");
    jar.delete("hone_refresh");
    return NextResponse.json({ token: null });
  }
}
