import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/webaudit/db";
import { getSession } from "@/lib/webaudit/auth";
import { scanQueue } from "@/lib/webaudit/queue";
import { ALL_MODULES, type ModuleKey } from "@/lib/webaudit/types";
import { rateLimit } from "@/lib/webaudit/rate-limit";

export const runtime = "nodejs";

const body = z.object({
  url: z.string().url(),
  projectId: z.string().uuid().optional(),
  modules: z.array(z.enum(ALL_MODULES as [ModuleKey, ...ModuleKey[]])).min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session = getSession();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "anon";
  const rlKey = session?.uid || ip;
  const rl = await rateLimit(`scan:${rlKey}`, 10, 60); // 10 scans / minute
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { url, projectId } = parsed.data;
  const modules = (parsed.data.modules || ALL_MODULES) as ModuleKey[];

  const [row] = await q<{ id: string }>(
    `INSERT INTO scans (user_id, project_id, url, modules, status, progress)
     VALUES ($1, $2, $3, $4::text[], 'queued', 0) RETURNING id`,
    [session?.uid || null, projectId || null, url, modules],
  );

  await scanQueue.add(
    "scan",
    { scanId: row.id, url, modules },
    { attempts: 1, removeOnComplete: 100, removeOnFail: 100 },
  );

  return NextResponse.json({ scanId: row.id, status: "queued", modules });
}
