import type { ModuleIssue, Risk } from "./types";

// Penalty weights applied to issues by severity. Pure functions only.
export const SEVERITY_WEIGHT = { critical: 25, warning: 8, info: 3 } as const;

export function scoreFromIssues(issues: ModuleIssue[], cap = 100): number {
  const penalty = issues.reduce((s, i) => s + SEVERITY_WEIGHT[i.severity], 0);
  return Math.max(0, Math.min(cap, 100 - penalty));
}

export function riskFromIssues(issues: ModuleIssue[]): Risk {
  const crits = issues.filter((i) => i.severity === "critical").length;
  const warns = issues.filter((i) => i.severity === "warning").length;
  if (crits >= 2) return "critical";
  if (crits === 1) return "high";
  if (warns >= 3) return "medium";
  return "low";
}

export function overallScore(moduleScores: Array<number | null | undefined>): number | null {
  const nums = moduleScores.filter((n): n is number => typeof n === "number");
  if (!nums.length) return null;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}
