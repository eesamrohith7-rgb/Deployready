import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/webaudit/db";
import { getSession } from "@/lib/webaudit/auth";
import { scanQueue } from "@/lib/webaudit/queue";
import { ALL_MODULES, type ModuleKey } from "@/lib/webaudit/types";
import { rateLimit } from "@/lib/webaudit/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const runtime = "nodejs";

const body = z.object({
  url: z.string().url().optional(),
  projectId: z.string().uuid().optional(),
  modules: z.array(z.enum(ALL_MODULES as [ModuleKey, ...ModuleKey[]])).min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session = getSession();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "anon";
  const rlKey = session?.uid || ip;
  const rl = await rateLimit(`scan:${rlKey}`, 10, 60); // 10 scans / minute
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const contentType = req.headers.get("content-type") || "";
  let url: string | undefined;
  let projectId: string | undefined;
  let modules: ModuleKey[] = ALL_MODULES;
  let uploadedFiles: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    url = formData.get("url") as string | null || undefined;
    projectId = formData.get("projectId") as string | null || undefined;

    // Handle file uploads
    const scanDir = join(tmpdir(), `wa-scan-${Date.now()}`);
    await mkdir(scanDir, { recursive: true });

    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File) {
        const buffer = await value.arrayBuffer();
        const filePath = join(scanDir, value.name);
        await writeFile(filePath, new Uint8Array(buffer));
        uploadedFiles.push(filePath);
      }
    }
  } else {
    const parsed = body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    ({ url, projectId } = parsed.data);
    modules = (parsed.data.modules || ALL_MODULES) as ModuleKey[];
    if (!url) {
      return NextResponse.json({ error: "URL required for JSON requests" }, { status: 400 });
    }
  }

  if (!url && uploadedFiles.length === 0) {
    return NextResponse.json({ error: "URL or files required" }, { status: 400 });
  }

  const [row] = await q<{ id: string }>(
    `INSERT INTO scans (user_id, project_id, url, modules, status, progress, metadata)
     VALUES ($1, $2, $3, $4::text[], 'queued', 0, $5::jsonb) RETURNING id`,
    [session?.uid || null, projectId || null, url || null, modules, JSON.stringify({ files: uploadedFiles })],
  );

  await scanQueue.add(
    "scan",
    { scanId: row.id, url: url || null, modules, files: uploadedFiles },
    { attempts: 1, removeOnComplete: 100, removeOnFail: 100 },
  );

  return NextResponse.json({ scanId: row.id, status: "queued", modules });
}
