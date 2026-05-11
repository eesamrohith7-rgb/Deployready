import { describe, expect, it } from "vitest";
import { scoreFromIssues, riskFromIssues, overallScore, SEVERITY_WEIGHT } from "@/lib/webaudit/score";
import type { ModuleIssue } from "@/lib/webaudit/types";

function issue(severity: ModuleIssue["severity"], id?: string): ModuleIssue {
  return { id: id ?? severity, title: id ?? severity, severity };
}

describe("scoreFromIssues", () => {
  it("returns 100 for no issues", () => {
    expect(scoreFromIssues([])).toBe(100);
  });

  it("applies severity weights", () => {
    expect(scoreFromIssues([issue("critical")])).toBe(100 - SEVERITY_WEIGHT.critical);
    expect(scoreFromIssues([issue("warning")])).toBe(100 - SEVERITY_WEIGHT.warning);
    expect(scoreFromIssues([issue("info")])).toBe(100 - SEVERITY_WEIGHT.info);
  });

  it("clamps to 0", () => {
    expect(scoreFromIssues(Array.from({ length: 10 }, () => issue("critical")))).toBe(0);
  });

  it("never exceeds the cap", () => {
    expect(scoreFromIssues([], 80)).toBe(80);
  });
});

describe("riskFromIssues", () => {
  it("returns 'low' for nothing", () => {
    expect(riskFromIssues([])).toBe("low");
  });
  it("'medium' for 3 warnings", () => {
    expect(riskFromIssues([issue("warning", "a"), issue("warning", "b"), issue("warning", "c")])).toBe("medium");
  });
  it("'high' for one critical", () => {
    expect(riskFromIssues([issue("critical")])).toBe("high");
  });
  it("'critical' for two criticals", () => {
    expect(riskFromIssues([issue("critical", "a"), issue("critical", "b")])).toBe("critical");
  });
});

describe("overallScore", () => {
  it("averages numeric scores and rounds", () => {
    expect(overallScore([80, 90, 70])).toBe(80);
    expect(overallScore([55, 60])).toBe(58);
  });
  it("ignores null/undefined", () => {
    expect(overallScore([null, 100, undefined, 80])).toBe(90);
  });
  it("returns null when no numeric scores", () => {
    expect(overallScore([null, undefined])).toBeNull();
  });
});
