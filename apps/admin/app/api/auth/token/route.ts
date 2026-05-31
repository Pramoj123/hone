import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("hone_admin_token")?.value ?? null;
  return NextResponse.json({ token });
}
