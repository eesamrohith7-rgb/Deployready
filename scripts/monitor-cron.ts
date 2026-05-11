/* eslint-disable no-console */
import { q } from "../lib/webaudit/db";
import { scanQueue } from "../lib/webaudit/queue";
import { logger } from "../lib/webaudit/logger";

// Lightweight cron checker. Run this every minute via host cron / k8s CronJob:
//   * * * * * node -r tsx/cjs scripts/monitor-cron.ts
// It triggers due monitors and inserts alerts for regressions.

function cronDue(cron: string, last?: Date | null): boolean {
  // Minimal interval support: "0 */N * * *" or "*/N * * * *"
  // For full support, swap in a real cron library.
  if (!last) return true;
  const since = Date.now() - last.getTime();
  if (/^\*\/(\d+) \* \* \* \*$/.test(cron)) {
    const n = Number(cron.match(/\*\/(\d+)/)![1]);
    return since >= n * 60_000;
  }
  if (/^0 \*\/(\d+) \* \* \*$/.test(cron)) {
    const n = Number(cron.match(/\*\/(\d+)/)![1]);
    return since >= n * 3_600_000;
  }
  return since >= 6 * 3_600_000;
}

async function main() {
  const monitors = await q<any>(`SELECT * FROM monitors WHERE enabled = TRUE`);
  for (const m of monitors) {
    if (!cronDue(m.cron, m.last_run_at ? new Date(m.last_run_at) : null)) continue;
    const [scan] = await q<{ id: string }>(
      `INSERT INTO scans (user_id, project_id, url, modules, status, progress)
       VALUES ($1,$2,$3,$4::text[],'queued',0) RETURNING id`,
      [m.user_id, m.project_id, m.url, m.modules],
    );
    await scanQueue.add("scan", { scanId: scan.id, url: m.url, modules: m.modules });
    await q(`UPDATE monitors SET last_run_at=now() WHERE id=$1`, [m.id]);
    logger.info({ monitorId: m.id, scanId: scan.id }, "monitor triggered");

    // Regression detection: compare to previous completed scan for this URL
    const prev = await q<any>(
      `SELECT overall_score FROM scans WHERE url=$1 AND status='completed' AND id<>$2 ORDER BY finished_at DESC NULLS LAST LIMIT 1`,
      [m.url, scan.id],
    );
    if (prev[0]?.overall_score && prev[0].overall_score > 0) {
      // Alert is created later once new scan completes (worker computes overall_score).
      // We pre-flag via a placeholder alert at info level:
      await q(
        `INSERT INTO alerts (monitor_id, scan_id, level, kind, message, data)
         VALUES ($1,$2,'info','scheduled',$3,$4)`,
        [m.id, scan.id, `Scheduled scan started for ${m.url}`, JSON.stringify({ prevScore: prev[0].overall_score })],
      );
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
