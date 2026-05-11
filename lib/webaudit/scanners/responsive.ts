import type { ModuleResult, ModuleIssue } from "../types";
import { getBrowser } from "./browser";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const VIEWPORTS = [
  { label: "mobile-320", width: 320, height: 568 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "laptop-1024", width: 1024, height: 768 },
  { label: "desktop-1440", width: 1440, height: 900 },
  { label: "ultra-2560", width: 2560, height: 1440 },
];

export async function runResponsive(url: string, scanId: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const browser = await getBrowser();
  const outDir = path.join(process.cwd(), "public", "scans", scanId);
  await mkdir(outDir, { recursive: true });

  const screenshots: Array<{ label: string; width: number; height: number; path: string; overflowX: boolean; hiddenCount: number }> = [];
  const issues: ModuleIssue[] = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hiddenCount: Array.from(document.querySelectorAll("*")).filter((el) => {
          const cs = getComputedStyle(el as Element);
          return cs.visibility === "hidden" || cs.display === "none";
        }).length,
      }));
      const overflowX = metrics.scrollWidth > metrics.clientWidth + 2;
      const filename = `${vp.label}.png`;
      const filepath = path.join(outDir, filename);
      const buf = await page.screenshot({ fullPage: false });
      await writeFile(filepath, buf);
      screenshots.push({
        label: vp.label,
        width: vp.width,
        height: vp.height,
        path: `/scans/${scanId}/${filename}`,
        overflowX,
        hiddenCount: metrics.hiddenCount,
      });
      if (overflowX) {
        issues.push({
          id: `resp-overflow-${vp.label}`,
          title: `Horizontal overflow at ${vp.width}px`,
          severity: vp.width <= 768 ? "critical" : "warning",
          description: `Page width ${metrics.scrollWidth}px > viewport ${vp.width}px`,
        });
      }
    } catch (e: any) {
      issues.push({ id: `resp-err-${vp.label}`, title: `Failed to render ${vp.label}`, severity: "warning", description: String(e?.message || e) });
    } finally {
      await ctx.close();
    }
  }

  const failed = issues.length;
  const score = Math.max(0, 100 - failed * 15);
  return {
    module: "responsive",
    score,
    data: { screenshots, viewports: VIEWPORTS },
    issues,
    durationMs: Date.now() - t0,
  };
}
