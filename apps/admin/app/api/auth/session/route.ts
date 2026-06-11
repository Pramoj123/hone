import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();
  if (typeof access_token !== "string" || !access_token) {
    return NextResponse.json({ error: "access_token is required" }, { status: 400 });
  }
  const jar = await cookies();
  jar.set("hone_admin_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 min — matches JWT_EXPIRES_IN
  });
  if (typeof refresh_token === "string" && refresh_token) {
    jar.set("hone_admin_refresh", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT_REFRESH_EXPIRES_IN
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  const refreshToken = jar.get("hone_admin_refresh")?.value;
  // Best-effort server-side revocation of the refresh token
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => null);
  }
  jar.delete("hone_admin_token");
  jar.delete("hone_admin_refresh");
  return NextResponse.json({ ok: true });
}
