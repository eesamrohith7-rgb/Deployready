import type { ModuleResult, ModuleIssue } from "../types";
import { getBrowser } from "./browser";

const MAX_PAGES = 25;

export async function runCrawler(url: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const origin = new URL(url).origin;
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  const queue: string[] = [url];
  const seen = new Set<string>();
  const pages: Array<{ url: string; status: number; title: string | null }> = [];
  const broken: Array<{ url: string; status: number; referrer?: string }> = [];

  try {
    while (queue.length && pages.length < MAX_PAGES) {
      const next = queue.shift()!;
      if (seen.has(next)) continue;
      seen.add(next);
      const page = await ctx.newPage();
      try {
        const resp = await page.goto(next, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const status = resp?.status() ?? 0;
        const title = await page.title().catch(() => null);
        pages.push({ url: next, status, title });
        if (status >= 400) broken.push({ url: next, status });
        if (status >= 200 && status < 400) {
          const links: string[] = await page.$$eval("a[href]", (els: any[]) =>
            els.map((e) => e.getAttribute("href")).filter(Boolean) as string[],
          );
          for (const href of links) {
            try {
              const abs = new URL(href, next).toString().split("#")[0];
              if (abs.startsWith(origin) && !seen.has(abs) && queue.length + pages.length < MAX_PAGES) {
                queue.push(abs);
              }
            } catch {}
          }
        }
      } catch (e: any) {
        broken.push({ url: next, status: 0 });
      } finally {
        await page.close();
      }
    }
  } finally {
    await ctx.close();
  }

  const issues: ModuleIssue[] = broken.slice(0, 10).map((b) => ({
    id: `crawl-broken-${b.url}`,
    title: `Broken page: ${b.url}`,
    severity: "critical",
    description: `HTTP ${b.status}`,
    fixPrompt: `Fix the broken response at ${b.url} (status ${b.status}).`,
  }));
  const score = Math.max(0, 100 - broken.length * 20);
  return {
    module: "crawler",
    score,
    data: { totalPages: pages.length, broken, pages: pages.slice(0, MAX_PAGES), limit: MAX_PAGES },
    issues,
    durationMs: Date.now() - t0,
  };
}
