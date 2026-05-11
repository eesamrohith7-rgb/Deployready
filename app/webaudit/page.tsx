"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/webaudit/Shell";

const FEATURES = [
  { icon: "speed", title: "Performance", desc: "Lighthouse-grade LCP / CLS / INP / TTFB, with optimization opportunities." },
  { icon: "search", title: "SEO", desc: "Meta, OG, sitemap, robots, JSON-LD, heading hierarchy, canonical." },
  { icon: "security", title: "Security", desc: "TLS, HSTS, CSP, exposed sensitive paths, headers grading." },
  { icon: "accessibility_new", title: "Accessibility", desc: "Full Axe-core audit with WCAG impact-tier severity." },
  { icon: "devices", title: "Responsive", desc: "Screenshots & overflow detection across 5 viewports." },
  { icon: "hub", title: "Crawler", desc: "Internal sitemap, broken pages, referrer chains." },
  { icon: "monitoring", title: "API Monitor", desc: "XHR / fetch durations, status codes, slowest endpoints." },
  { icon: "bug_report", title: "Errors", desc: "Console errors, unhandled exceptions, failed resources." },
  { icon: "auto_awesome", title: "AI Insights", desc: "Each module result is summarized and prioritized by an LLM." },
];

export default function WebAuditLanding() {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/scans/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const { scanId } = await r.json();
      router.push(`/scan/${scanId}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to start scan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <section className="text-center py-12 flex flex-col items-center gap-6">
        <h1 className="font-sans text-headline-xl text-on-surface max-w-3xl">
          Production website audits, in <span className="text-primary-container">one scan.</span>
        </h1>
        <p className="font-mono text-code-md text-on-surface-variant max-w-2xl">
          Performance · SEO · Security · A11y · Responsive · Crawl · Functional · API · Errors — orchestrated through BullMQ, persisted in Postgres, summarized by Claude.
        </p>
        <form onSubmit={submit} className="w-full max-w-2xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center bg-surface-container-lowest border border-outline-variant px-4 py-3 rounded-DEFAULT focus-within:border-primary-container focus-within:shadow-[0_0_20px_rgba(243,128,32,0.15)] transition-all">
            <span className="font-mono text-code-lg text-primary mr-3">&gt;</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="flex-grow bg-transparent border-none outline-none p-0 font-mono text-code-md text-on-surface placeholder:text-on-surface-variant/50"
            />
          </div>
          <button
            disabled={submitting}
            className="bg-primary-container text-on-primary-container font-mono text-label-caps font-bold uppercase tracking-wider px-8 py-3 rounded-DEFAULT hover:shadow-[0_0_25px_rgba(243,128,32,0.5)] disabled:opacity-60"
          >
            {submitting ? "Queuing…" : "Run Full Audit"}
          </button>
          {err && <p className="text-error font-mono text-code-md">{err}</p>}
        </form>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
        {FEATURES.map((f) => (
          <div key={f.title} className="bento p-6 flex flex-col gap-3">
            <span className="material-symbols-outlined text-primary text-[28px]">{f.icon}</span>
            <h3 className="font-sans text-headline-md">{f.title}</h3>
            <p className="font-mono text-code-md text-on-surface-variant">{f.desc}</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
