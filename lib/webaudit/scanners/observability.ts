import type { ModuleResult, ModuleIssue } from "../types";
import { getBrowser } from "./browser";

// Runs API and Error monitors together in a single page load to save time,
// but emits two separate ModuleResult objects.
export async function runObservability(url: string): Promise<{ api: ModuleResult; errors: ModuleResult }> {
  const t0 = Date.now();
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  type Req = { url: string; method: string; status: number; durationMs: number; type: string; failed: boolean };
  const requests: Req[] = [];
  const consoleErrors: { type: string; text: string }[] = [];
  const pageErrors: string[] = [];
  const failedResources: { url: string; failure: string }[] = [];

  const start = new Map<string, number>();
  page.on("request", (r: any) => start.set(r.url(), Date.now()));
  page.on("requestfinished", async (r: any) => {
    const resp = await r.response().catch(() => null);
    const status = resp ? resp.status() : 0;
    const t = start.get(r.url()) ?? Date.now();
    requests.push({
      url: r.url(),
      method: r.method(),
      status,
      durationMs: Date.now() - t,
      type: r.resourceType(),
      failed: status >= 400,
    });
  });
  page.on("requestfailed", (r: any) => {
    failedResources.push({ url: r.url(), failure: r.failure()?.errorText || "unknown" });
  });
  page.on("console", (msg: any) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (e: any) => pageErrors.push(String(e?.message || e)));

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 35_000 });
    await page.waitForTimeout(1500);
  } catch {}
  await ctx.close();

  // -------- API module --------
  const xhrLike = requests.filter((r) => r.type === "xhr" || r.type === "fetch");
  const failedXhr = xhrLike.filter((r) => r.failed);
  const apiIssues: ModuleIssue[] = failedXhr.slice(0, 10).map((r) => ({
    id: `api-fail-${r.url}`,
    title: `API ${r.status} ${r.method} ${r.url}`,
    severity: r.status >= 500 ? "critical" : "warning",
    description: `Duration: ${r.durationMs}ms`,
    fixPrompt: `Investigate failing API call ${r.method} ${r.url} returning ${r.status}.`,
  }));
  const avgDuration = xhrLike.length
    ? Math.round(xhrLike.reduce((s, r) => s + r.durationMs, 0) / xhrLike.length)
    : 0;
  const api: ModuleResult = {
    module: "api_monitor",
    score: Math.max(0, 100 - failedXhr.length * 15),
    data: {
      total: xhrLike.length,
      failed: failedXhr.length,
      avgDurationMs: avgDuration,
      slowest: [...xhrLike].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
      requests: xhrLike.slice(0, 50),
    },
    issues: apiIssues,
    durationMs: Date.now() - t0,
  };

  // -------- Error module --------
  const errIssues: ModuleIssue[] = [];
  for (const e of pageErrors.slice(0, 8))
    errIssues.push({ id: `err-page-${errIssues.length}`, title: "Unhandled JS error", severity: "critical", description: e });
  for (const c of consoleErrors.slice(0, 8))
    errIssues.push({
      id: `err-console-${errIssues.length}`,
      title: `Console ${c.type}`,
      severity: c.type === "error" ? "warning" : "info",
      description: c.text,
    });
  for (const r of failedResources.slice(0, 8))
    errIssues.push({
      id: `err-res-${errIssues.length}`,
      title: `Failed resource: ${r.url}`,
      severity: "warning",
      description: r.failure,
    });
  const errScore = Math.max(0, 100 - pageErrors.length * 20 - consoleErrors.length * 4 - failedResources.length * 6);
  const errors: ModuleResult = {
    module: "error_monitor",
    score: errScore,
    data: { pageErrors, consoleErrors, failedResources },
    issues: errIssues,
    durationMs: Date.now() - t0,
  };

  return { api, errors };
}
