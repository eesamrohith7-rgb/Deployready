/* eslint-disable no-console */
import { Worker, type Job } from "bullmq";
import { QUEUE_NAME, type ScanJob } from "@/lib/webaudit/queue";
import IORedis from "ioredis";
import { eventsChannel } from "@/lib/webaudit/redis";
import { runModule } from "@/lib/webaudit/scanners";
import { generateInsights } from "@/lib/webaudit/ai";
import { pool, q } from "@/lib/webaudit/db";
import { closeBrowser } from "@/lib/webaudit/scanners/browser";
import type { ModuleKey, ModuleResult, ScanEvent } from "@/lib/webaudit/types";
import { logger } from "@/lib/webaudit/logger";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 2);

// Dedicated Redis client for BullMQ (must have maxRetriesPerRequest: null)
const bullmqRedis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Separate Redis client for pub/sub (can have retry strategy)
const pubsubRedis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  retryStrategy: (times: number) => (times > 8 ? null : Math.min(times * 200, 2000)),
});

async function emit(scanId: string, ev: Omit<ScanEvent, "scanId" | "ts">) {
  const payload: ScanEvent = { ...ev, scanId, ts: new Date().toISOString() };
  await pubsubRedis.publish(eventsChannel(scanId), JSON.stringify(payload));
}

async function setScanStatus(scanId: string, status: string, extra: Record<string, any> = {}) {
  const fields = Object.keys(extra);
  const setClauses = ["status=$2", ...fields.map((f, i) => `${f}=$${i + 3}`)].join(", ");
  await q(`UPDATE scans SET ${setClauses} WHERE id=$1`, [scanId, status, ...fields.map((f) => extra[f])]);
}

async function upsertModuleResult(scanId: string, module: ModuleKey, patch: Record<string, any>) {
  const cols = ["status", "score", "risk", "data", "ai_insights", "duration_ms", "error"];
  const keys = Object.keys(patch).filter((k) => cols.includes(k));
  await q(
    `INSERT INTO scan_results (scan_id, module, ${keys.join(", ")})
     VALUES ($1, $2, ${keys.map((_, i) => `$${i + 3}`).join(", ")})
     ON CONFLICT (scan_id, module) DO UPDATE SET ${keys.map((k, i) => `${k}=EXCLUDED.${k}`).join(", ")}`,
    [scanId, module, ...keys.map((k) => (k === "data" || k === "ai_insights" ? JSON.stringify(patch[k]) : patch[k]))],
  );
}

async function processOne(scanId: string, url: string, module: ModuleKey, total: number, completed: { n: number }) {
  await upsertModuleResult(scanId, module, { status: "running" });
  await emit(scanId, { type: "module.started", module });
  const t0 = Date.now();
  try {
    const r = (await runModule(module, { scanId, url })) as ModuleResult;
    const insights = await generateInsights({ module, url, data: { ...r.data, issues: r.issues, score: r.score } });
    await upsertModuleResult(scanId, module, {
      status: "done",
      score: r.score ?? null,
      risk: r.risk ?? null,
      data: { ...r.data, issues: r.issues },
      ai_insights: insights,
      duration_ms: Date.now() - t0,
    });
    completed.n += 1;
    const progress = Math.round((completed.n / total) * 100);
    await q(`UPDATE scans SET progress=$2 WHERE id=$1`, [scanId, progress]);
    await emit(scanId, { type: "module.done", module, progress, result: r });
    logger.info({ scanId, module, score: r.score, dur: Date.now() - t0 }, "module done");
  } catch (e: any) {
    const err = String(e?.message || e);
    await upsertModuleResult(scanId, module, { status: "failed", error: err, duration_ms: Date.now() - t0 });
    completed.n += 1;
    const progress = Math.round((completed.n / total) * 100);
    await q(`UPDATE scans SET progress=$2 WHERE id=$1`, [scanId, progress]);
    await emit(scanId, { type: "module.failed", module, progress, error: err });
    logger.error({ scanId, module, err }, "module failed");
  }
}

const worker = new Worker<ScanJob>(
  QUEUE_NAME,
  async (job: Job<ScanJob>) => {
    const { scanId, url, modules } = job.data;
    logger.info({ scanId, url, modules }, "scan start");
    await setScanStatus(scanId, "running", { started_at: new Date() });
    await emit(scanId, { type: "scan.started", message: `Scanning ${url}` });
    const completed = { n: 0 };

    // Run modules in parallel with a small pool to keep mem/cpu reasonable
    const pool = Math.min(3, modules.length);
    const queue = [...modules] as ModuleKey[];
    const workers = Array.from({ length: pool }, async () => {
      while (queue.length) {
        const m = queue.shift()!;
        await processOne(scanId, url, m, modules.length, completed);
      }
    });
    await Promise.all(workers);

    // Compute overall score = avg of module scores that exist
    const rows = await q<{ score: number | null }>(
      `SELECT score FROM scan_results WHERE scan_id=$1 AND score IS NOT NULL`,
      [scanId],
    );
    const overall = rows.length ? Math.round(rows.reduce((s, r) => s + (r.score || 0), 0) / rows.length) : null;
    await setScanStatus(scanId, "completed", { finished_at: new Date(), overall_score: overall, progress: 100 });
    await emit(scanId, { type: "scan.completed", progress: 100, message: `Overall ${overall ?? "—"}/100` });
    logger.info({ scanId, overall }, "scan completed");
  },
  { connection: bullmqRedis as any, concurrency: CONCURRENCY },
);

worker.on("failed", async (job: Job<ScanJob> | undefined, err: Error) => {
  if (!job) return;
  await setScanStatus(job.data.scanId, "failed", { error: err.message, finished_at: new Date() });
  await emit(job.data.scanId, { type: "scan.failed", error: err.message });
  logger.error({ jobId: job.id, err: err.message }, "job failed");
});

async function shutdown(sig: string) {
  logger.warn({ sig }, "shutting down worker");
  await worker.close();
  await closeBrowser();
  await pool.end();
  await pubsubRedis.quit();
  await bullmqRedis.quit();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

logger.info({ concurrency: CONCURRENCY }, "WebAudit Pro worker online");
