import { NextResponse } from "next/server";
import { pool } from "@/lib/webaudit/db";
import { redis } from "@/lib/webaudit/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const result: Record<string, any> = { status: "ok", checks: {} };
  try {
    const r = await pool.query("SELECT 1 as ok");
    result.checks.postgres = { ok: r.rows[0]?.ok === 1 };
  } catch (e: any) {
    result.checks.postgres = { ok: false, error: String(e?.message || e) };
    result.status = "degraded";
  }
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("redis ping timeout")), 3000)),
    ]);
    result.checks.redis = { ok: pong === "PONG" };
  } catch (e: any) {
    result.checks.redis = { ok: false, error: String(e?.message || e) };
    result.status = "degraded";
  }
  result.durationMs = Date.now() - started;
  return NextResponse.json(result, { status: result.status === "ok" ? 200 : 503 });
}
