import type { ModuleResult, ModuleIssue } from "../types";
import { getBrowser } from "./browser";
import { deriveSeoIssues } from "./_seo-rules";
import { scoreFromIssues } from "../score";

export async function runSeo(url: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const data = await page.evaluate(() => {
    const meta = (n: string) =>
      document.querySelector(`meta[name="${n}"]`)?.getAttribute("content") ||
      document.querySelector(`meta[property="${n}"]`)?.getAttribute("content") ||
      null;
    const headings = ["h1", "h2", "h3"].map((t) => ({
      tag: t,
      count: document.querySelectorAll(t).length,
    }));
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;
    return {
      title: document.title || null,
      description: meta("description"),
      ogTitle: meta("og:title"),
      ogDescription: meta("og:description"),
      ogImage: meta("og:image"),
      twitterCard: meta("twitter:card"),
      canonical,
      lang: document.documentElement.lang || null,
      headings,
      hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
    };
  });

  const base = new URL(url);
  const [robots, sitemap] = await Promise.all([
    fetch(new URL("/robots.txt", base)).then((r) => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false, status: 0 })),
    fetch(new URL("/sitemap.xml", base)).then((r) => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false, status: 0 })),
  ]);
  await ctx.close();

  const issues: ModuleIssue[] = deriveSeoIssues({
    title: data.title,
    description: data.description,
    ogTitle: data.ogTitle,
    ogImage: data.ogImage,
    canonical: data.canonical,
    headings: data.headings,
    hasStructuredData: data.hasStructuredData,
    robotsOk: robots.ok,
    sitemapOk: sitemap.ok,
  });

  return {
    module: "seo",
    score: scoreFromIssues(issues),
    data: { ...data, robotsTxt: robots, sitemap, issueCount: issues.length },
    issues,
    durationMs: Date.now() - t0,
  };
}
