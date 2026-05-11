import { describe, expect, it } from "vitest";
import { deriveSeoIssues } from "@/lib/webaudit/scanners/_seo-rules";

const perfect = {
  title: "A reasonable title under 70 chars",
  description: "A solid meta description that is roughly the right length.",
  ogTitle: "OG",
  ogImage: "https://x/y.png",
  canonical: "https://x/",
  headings: [
    { tag: "h1", count: 1 },
    { tag: "h2", count: 3 },
  ],
  hasStructuredData: true,
  robotsOk: true,
  sitemapOk: true,
};

describe("deriveSeoIssues", () => {
  it("returns no issues for a fully optimized page", () => {
    expect(deriveSeoIssues(perfect)).toEqual([]);
  });

  it("flags missing title as critical", () => {
    const issues = deriveSeoIssues({ ...perfect, title: null });
    expect(issues.find((i) => i.id === "seo-title")?.severity).toBe("critical");
  });

  it("flags long title as warning", () => {
    const issues = deriveSeoIssues({ ...perfect, title: "x".repeat(100) });
    expect(issues.find((i) => i.id === "seo-title-long")?.severity).toBe("warning");
  });

  it("flags missing OG as warning when image missing", () => {
    const issues = deriveSeoIssues({ ...perfect, ogImage: null });
    expect(issues.find((i) => i.id === "seo-og")).toBeTruthy();
  });

  it("flags multiple h1 as info", () => {
    const issues = deriveSeoIssues({ ...perfect, headings: [{ tag: "h1", count: 3 }] });
    expect(issues.find((i) => i.id === "seo-h1-multi")?.severity).toBe("info");
  });

  it("flags no h1 as warning", () => {
    const issues = deriveSeoIssues({ ...perfect, headings: [{ tag: "h1", count: 0 }] });
    expect(issues.find((i) => i.id === "seo-h1")?.severity).toBe("warning");
  });
});
