import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/webaudit/db";
import { getSession } from "@/lib/webaudit/auth";

export const runtime = "nodejs";

const body = z.object({ name: z.string().min(1).max(100), url: z.string().url() });

export async function GET() {
  const s = getSession();
  if (!s) return NextResponse.json({ projects: [] });
  const rows = await q(`SELECT * FROM projects WHERE user_id=$1 ORDER BY created_at DESC`, [s.uid]);
  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const [row] = await q(
    `INSERT INTO projects (user_id, name, url) VALUES ($1,$2,$3) RETURNING *`,
    [s.uid, parsed.data.name, parsed.data.url],
  );
  return NextResponse.json({ project: row });
}
