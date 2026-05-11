import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { one } from "@/lib/webaudit/db";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/webaudit/auth";

export const runtime = "nodejs";

const body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const user = await one<{ id: string; email: string; password_hash: string; name: string | null }>(
    `SELECT id, email, password_hash, name FROM users WHERE email=$1`,
    [parsed.data.email],
  );
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = signToken({ uid: user.id, email: user.email });
  setSessionCookie(token);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
