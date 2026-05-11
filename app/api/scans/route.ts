import { NextResponse } from "next/server";
import { q } from "@/lib/webaudit/db";
import { getSession } from "@/lib/webaudit/auth";

export const runtime = "nodejs";

export async function GET() {
  const s = getSession();
  const rows = await q(
    s
      ? `SELECT id, url, status, progress, overall_score, created_at FROM scans WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`
      : `SELECT id, url, status, progress, overall_score, created_at FROM scans WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 25`,
    s ? [s.uid] : [],
  );
  return NextResponse.json({ scans: rows });
}
