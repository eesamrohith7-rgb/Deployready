import { describe, expect, it, beforeEach } from "vitest";
import { generateInsights } from "@/lib/webaudit/ai";

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe("generateInsights heuristic fallback (no API key)", () => {
  it("produces at least one insight when score is low", async () => {
    const out = await generateInsights({
      module: "performance",
      url: "https://example.com",
      data: { score: 22, issues: [{ id: "x", title: "LCP poor", severity: "critical", fixPrompt: "Optimize." }] },
    });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].priority).toBeLessThanOrEqual(2);
  });

  it("returns an info-tier note when no issues", async () => {
    const out = await generateInsights({ module: "seo", url: "https://example.com", data: {} });
    expect(out[0].severity).toBe("info");
  });

  it("passes through critical severities from input issues", async () => {
    const out = await generateInsights({
      module: "security",
      url: "https://example.com",
      data: { issues: [{ id: "sec-https", title: "HTTP only", severity: "critical" }] },
    });
    expect(out.some((i) => i.severity === "critical")).toBe(true);
  });
});
