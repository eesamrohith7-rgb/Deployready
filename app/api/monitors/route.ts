import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/webaudit/db";
import { getSession } from "@/lib/webaudit/auth";
import { ALL_MODULES, type ModuleKey } from "@/lib/webaudit/types";

export const runtime = "nodejs";

const body = z.object({
  url: z.string().url(),
  cron: z.string().default("0 */6 * * *"),
  modules: z.array(z.enum(ALL_MODULES as [ModuleKey, ...ModuleKey[]])).min(1).default(["performance", "security", "seo"]),
  projectId: z.string().uuid().optional(),
});

export async function GET() {
  const s = getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await q(`SELECT * FROM monitors WHERE user_id=$1 ORDER BY created_at DESC`, [s.uid]);
  return NextResponse.json({ monitors: rows });
}

export async function POST(req: NextRequest) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { url, cron, modules, projectId } = parsed.data;
  const [row] = await q(
    `INSERT INTO monitors (user_id, project_id, url, cron, modules) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [s.uid, projectId || null, url, cron, modules],
  );
  return NextResponse.json({ monitor: row });
}
