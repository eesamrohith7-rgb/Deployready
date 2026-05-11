import { NextResponse } from "next/server";
import { q, one } from "@/lib/webaudit/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scan = await one(
    `SELECT id, url, status, modules, progress, overall_score, error, started_at, finished_at, created_at FROM scans WHERE id=$1`,
    [params.id],
  );
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const results = await q(
    `SELECT module, status, score, risk, data, ai_insights, duration_ms, error
     FROM scan_results WHERE scan_id=$1 ORDER BY module`,
    [params.id],
  );
  return NextResponse.json({ scan, results });
}
