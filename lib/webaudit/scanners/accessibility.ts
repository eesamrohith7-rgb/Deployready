import type { ModuleResult, ModuleIssue } from "../types";
import { getBrowser } from "./browser";
import { AxeBuilder } from "@axe-core/playwright";

export async function runAccessibility(url: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Cast: @axe-core/playwright resolves Playwright types from a sibling install
    // which TS sees as a structurally different Page than ours.
    const axe = await new AxeBuilder({ page: page as any }).analyze();
    const issues: ModuleIssue[] = axe.violations.slice(0, 20).map((v) => ({
      id: `a11y-${v.id}`,
      title: v.help,
      severity:
        v.impact === "critical" ? "critical" : v.impact === "serious" ? "critical" : v.impact === "moderate" ? "warning" : "info",
      description: `${v.description} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`,
      fixPrompt: `Resolve axe rule "${v.id}" on ${url}. See ${v.helpUrl}.`,
    }));

    const total = axe.passes.length + axe.violations.length || 1;
    const score = Math.round((axe.passes.length / total) * 100);
    return {
      module: "accessibility",
      score,
      data: {
        violations: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
        })),
        passCount: axe.passes.length,
        violationCount: axe.violations.length,
        incompleteCount: axe.incomplete.length,
      },
      issues,
      durationMs: Date.now() - t0,
    };
  } finally {
    await ctx.close();
  }
}
