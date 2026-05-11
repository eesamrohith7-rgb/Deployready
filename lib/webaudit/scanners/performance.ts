import type { ModuleResult } from "../types";

export async function runPerformance(url: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const lighthouse = (await import("lighthouse")).default as any;
  const chromeLauncher = (await import("chrome-launcher")) as any;

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance"],
      },
      undefined,
    );
    const lhr = result?.lhr;
    const score = Math.round(((lhr?.categories?.performance?.score ?? 0) * 100) || 0);
    const audits = lhr?.audits || {};
    const metric = (k: string) => audits[k]?.numericValue ?? null;
    const data = {
      score,
      lcpMs: metric("largest-contentful-paint"),
      clsScore: metric("cumulative-layout-shift"),
      inpMs: metric("interaction-to-next-paint"),
      ttfbMs: metric("server-response-time"),
      fcpMs: metric("first-contentful-paint"),
      speedIndex: metric("speed-index"),
      totalBlockingMs: metric("total-blocking-time"),
      transferKb: metric("total-byte-weight")
        ? Math.round((metric("total-byte-weight") as number) / 1024)
        : null,
      requestCount: audits["network-requests"]?.details?.items?.length ?? null,
      opportunities: Object.values(audits)
        .filter((a: any) => a?.details?.type === "opportunity" && (a.score ?? 1) < 1)
        .slice(0, 6)
        .map((a: any) => ({ id: a.id, title: a.title, savingsMs: a.numericValue ?? null })),
    };
    const issues = data.opportunities.map((o) => {
      const severity: "critical" | "warning" = (o.savingsMs ?? 0) > 1500 ? "critical" : "warning";
      return {
        id: `perf-${o.id}`,
        title: o.title,
        severity,
        description: `Potential savings: ${o.savingsMs ? Math.round(o.savingsMs) + "ms" : "n/a"}`,
        fixPrompt: `Resolve the Lighthouse audit "${o.id}" on ${url}. Provide concrete code or build-step changes.`,
      };
    });
    return { module: "performance", score, data, issues, durationMs: Date.now() - t0 };
  } finally {
    await chrome.kill().catch(() => {});
  }
}
