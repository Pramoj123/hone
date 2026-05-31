import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(): Promise<NextResponse> {
  const jar = await cookies();
  const token = jar.get("hone_token")?.value ?? null;
  return NextResponse.json({ token });
}
