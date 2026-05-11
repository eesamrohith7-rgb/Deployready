import { NextResponse } from "next/server";
import { getSession } from "@/lib/webaudit/auth";
import { one } from "@/lib/webaudit/db";

export const runtime = "nodejs";

export async function GET() {
  const s = getSession();
  if (!s) return NextResponse.json({ user: null }, { status: 200 });
  const user = await one(`SELECT id, email, name, created_at FROM users WHERE id=$1`, [s.uid]);
  return NextResponse.json({ user });
}
