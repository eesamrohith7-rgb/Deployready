import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q, one } from "@/lib/webaudit/db";
import { hashPassword, signToken, setSessionCookie } from "@/lib/webaudit/auth";

export const runtime = "nodejs";

const body = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { email, password, name } = parsed.data;

  const existing = await one(`SELECT id FROM users WHERE email=$1`, [email]);
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const hash = await hashPassword(password);
  const [row] = await q<{ id: string; email: string }>(
    `INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email`,
    [email, hash, name || null],
  );
  const token = signToken({ uid: row.id, email: row.email });
  setSessionCookie(token);
  return NextResponse.json({ user: { id: row.id, email: row.email, name: name || null } });
}
