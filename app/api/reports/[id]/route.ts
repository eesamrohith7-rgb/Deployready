import { NextResponse } from "next/server";
import { q, one } from "@/lib/webaudit/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";
  const scan = await one(
    `SELECT id, url, status, overall_score, modules, started_at, finished_at, created_at FROM scans WHERE id=$1`,
    [params.id],
  );
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const results = await q(
    `SELECT module, status, score, risk, data, ai_insights, duration_ms FROM scan_results WHERE scan_id=$1 ORDER BY module`,
    [params.id],
  );

  if (format === "csv") {
    const rows = [
      "module,status,score,risk,duration_ms",
      ...results.map((r: any) => [r.module, r.status, r.score ?? "", r.risk ?? "", r.duration_ms ?? ""].join(",")),
    ].join("\n");
    return new Response(rows, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=report-${params.id}.csv` },
    });
  }
  return NextResponse.json({ scan, results });
}
