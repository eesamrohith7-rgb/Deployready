import type { ModuleIssue } from "../types";

export interface SeoInput {
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogImage: string | null;
  canonical: string | null;
  headings: Array<{ tag: string; count: number }>;
  hasStructuredData: boolean;
  robotsOk: boolean;
  sitemapOk: boolean;
}

export function deriveSeoIssues(d: SeoInput): ModuleIssue[] {
  const issues: ModuleIssue[] = [];
  if (!d.title) issues.push({ id: "seo-title", title: "Missing <title>", severity: "critical", fixPrompt: "Add a concise, unique <title> tag (50-60 chars)." });
  else if (d.title.length > 70) issues.push({ id: "seo-title-long", title: "Title too long", severity: "warning" });
  if (!d.description) issues.push({ id: "seo-desc", title: "Missing meta description", severity: "warning" });
  if (!d.ogTitle || !d.ogImage) issues.push({ id: "seo-og", title: "Incomplete Open Graph tags", severity: "warning" });
  if (!d.canonical) issues.push({ id: "seo-canonical", title: "Missing canonical URL", severity: "warning" });
  if (!d.robotsOk) issues.push({ id: "seo-robots", title: "robots.txt missing", severity: "warning" });
  if (!d.sitemapOk) issues.push({ id: "seo-sitemap", title: "sitemap.xml missing", severity: "warning" });
  const h1 = d.headings.find((h) => h.tag === "h1")?.count ?? 0;
  if (h1 === 0) issues.push({ id: "seo-h1", title: "No <h1> on page", severity: "warning" });
  else if (h1 > 1) issues.push({ id: "seo-h1-multi", title: "Multiple <h1> tags", severity: "info" });
  if (!d.hasStructuredData) issues.push({ id: "seo-jsonld", title: "No JSON-LD structured data", severity: "info" });
  return issues;
}
