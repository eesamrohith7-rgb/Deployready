"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Issue, UrlCheckResult } from "@/lib/types";

function HealthRing({ score }: { score: number }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 85 ? "#4ade80" : score >= 65 ? "#f38020" : score >= 40 ? "#fbbf24" : "#ffb4ab";
  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="transparent" stroke="#353534" strokeWidth="4" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="transparent"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="font-sans text-headline-xl text-on-surface leading-none">{score}</span>
        <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mt-1">
          /100
        </span>
      </div>
    </div>
  );
}

function statusFromScore(score: number) {
  if (score >= 90) return { label: "Optimal", color: "text-success" };
  if (score >= 75) return { label: "Healthy", color: "text-primary" };
  if (score >= 50) return { label: "Needs Work", color: "text-warning" };
  return { label: "At Risk", color: "text-error" };
}

function computeScore(issues: Issue[]) {
  const crit = issues.filter((i) => i.severity === "critical").length;
  const warn = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;
  const score = Math.max(0, 100 - crit * 12 - warn * 4 - info * 1);
  return Math.round(score);
}

export default function ReportView() {
  const [result, setResult] = useState<UrlCheckResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dr:lastScan");
      if (raw) setResult(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  if (loaded && !result) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
        <h1 className="font-sans text-headline-lg text-on-surface">No scan in this session</h1>
        <p className="font-mono text-code-md text-on-surface-variant max-w-md">
          Run a scan from the dashboard to populate the diagnostic log.
        </p>
        <Link
          href="/"
          className="bg-primary-container text-on-primary-container font-mono text-label-caps font-bold uppercase tracking-wider px-6 py-3 rounded-DEFAULT inline-flex items-center gap-2 hover:shadow-[0_0_25px_rgba(243,128,32,0.5)]"
        >
          <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
          Run a Scan
        </Link>
      </main>
    );
  }

  if (!result) return null;

  const issues = result.issues || [];
  const failures = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const passes = issues.filter((i) => i.severity === "info");
  const score = computeScore(issues);
  const status = statusFromScore(score);
  const host = (() => {
    try {
      return new URL(result.url).hostname;
    } catch {
      return result.url;
    }
  })();
  const scanId = `DR-${new Date(result.scannedAt).getTime().toString(36).toUpperCase().slice(-8)}`;
  const exec = result.loadTimeMs ? (result.loadTimeMs / 1000).toFixed(2) : "—";

  function exportJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `deployready-${scanId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }

  function printPdf() {
    window.print();
  }

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-8">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary font-mono text-code-md">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>SCAN COMPLETE</span>
        </div>
        <h1 className="font-sans text-headline-xl text-on-surface">Target: {host}</h1>
        <p className="font-mono text-code-md text-on-surface-variant">
          Execution time: {exec}s | ID: #{scanId}
        </p>
      </section>

      {/* Top bento: score / summary / export */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Health score */}
        <div className="md:col-span-4 bento p-6 flex flex-col justify-between min-h-[260px]">
          <div className="flex justify-between items-start">
            <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant">
              Website Health Score
            </span>
            <span className="material-symbols-outlined text-primary-container">monitor_heart</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <HealthRing score={score} />
          </div>
          <div className={`text-center font-mono text-code-md ${status.color}`}>
            Status: {status.label}
          </div>
        </div>

        {/* Issue summary */}
        <div className="md:col-span-4 bento p-6 flex flex-col justify-between min-h-[260px]">
          <div className="flex justify-between items-start mb-6">
            <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant">
              Issue Summary
            </span>
            <span className="material-symbols-outlined text-on-surface-variant">bar_chart</span>
          </div>
          <div className="flex flex-col gap-3 flex-grow justify-center">
            <SummaryRow label="Passes" count={passes.length} color="#4ade80" />
            <SummaryRow label="Warnings" count={warnings.length} color="#f38020" />
            <SummaryRow label="Failures" count={failures.length} color="#ffb4ab" />
          </div>
        </div>

        {/* Export */}
        <div className="md:col-span-4 bento p-6 flex flex-col justify-between min-h-[260px]">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant">
              Export Data
            </span>
            <span className="material-symbols-outlined text-on-surface-variant">download</span>
          </div>
          <div className="flex flex-col gap-3 flex-grow justify-center">
            <button
              onClick={printPdf}
              className="w-full bg-primary-container text-on-primary-container font-mono text-code-lg py-3 rounded-DEFAULT hover:brightness-110 transition-all flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined icon-fill text-[20px]">picture_as_pdf</span>
              Download Full Report (PDF)
            </button>
            <button
              onClick={exportJson}
              className="w-full bg-transparent border border-outline-variant text-on-surface font-mono text-code-lg py-3 rounded-DEFAULT hover:border-primary-container hover:text-primary-container transition-all flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">data_object</span>
              Export Data (JSON)
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-container-highest text-center">
            <span className="font-mono text-code-md text-primary flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px]">lock_open</span>
              No account required
            </span>
          </div>
        </div>
      </section>

      {/* Diagnostic Log */}
      <section className="flex flex-col gap-3 mt-2">
        <h2 className="font-sans text-headline-md text-on-surface mb-1">Diagnostic Log</h2>

        {failures.length > 0 && (
          <LogBlock
            color="#ffb4ab"
            label={`CRITICAL FAILURES (${failures.length})`}
            issues={failures}
          />
        )}
        {warnings.length > 0 && (
          <LogBlock
            color="#f38020"
            label={`WARNINGS (${warnings.length})`}
            issues={warnings.slice(0, 8)}
            extra={
              warnings.length > 8 ? (
                <div className="font-mono text-code-md text-on-surface-variant pl-4">
                  ... {warnings.length - 8} more warnings suppressed. Export JSON for full list.
                </div>
              ) : null
            }
          />
        )}

        <details className="bento p-4 cursor-pointer group">
          <summary className="flex justify-between items-center list-none">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-success">check</span>
              <span className="font-mono text-code-md text-on-surface">
                {passes.length} Checks Passed Successfully
              </span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform">
              expand_more
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {passes.map((p) => (
              <div key={p.id} className="font-mono text-code-md text-on-surface-variant">
                <span className="text-success mr-1">✓</span>
                {p.title}
              </div>
            ))}
          </div>
        </details>
      </section>
    </main>
  );
}

function SummaryRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex justify-between items-center bg-surface border border-surface-container-highest px-4 py-3 rounded-DEFAULT">
      <span
        className="font-mono text-code-lg flex items-center gap-2"
        style={{ color }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: color }} /> {label}
      </span>
      <span className="font-sans text-headline-md" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

function LogBlock({
  color,
  label,
  issues,
  extra,
}: {
  color: string;
  label: string;
  issues: Issue[];
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="bento p-4 flex flex-col gap-2"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div
        className="font-mono text-label-caps font-bold uppercase tracking-wider mb-1"
        style={{ color }}
      >
        {label}
      </div>
      {issues.map((i) => (
        <div
          key={i.id}
          className="font-mono text-code-md text-on-surface flex items-start gap-2"
        >
          <span className="mt-0.5" style={{ color }}>
            &gt;
          </span>
          <div>
            <span className="text-on-background">{i.id.toUpperCase().replace(/-/g, "_")}:</span>{" "}
            {i.title}
            {i.description ? (
              <div className="text-on-surface-variant text-xs mt-0.5">{i.description}</div>
            ) : null}
          </div>
        </div>
      ))}
      {extra}
    </div>
  );
}
