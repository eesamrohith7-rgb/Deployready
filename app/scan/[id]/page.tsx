"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/webaudit/Shell";

type Ev = {
  type: string;
  scanId: string;
  module?: string;
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
  ts: string;
};

type Status = {
  scan: { url: string; status: string; progress: number; overall_score: number | null; modules: string[] };
  results: Array<{ module: string; status: string; score: number | null; risk: string | null; duration_ms: number | null }>;
};

const MODULE_META: Record<string, { label: string; icon: string }> = {
  performance: { label: "Performance", icon: "speed" },
  seo: { label: "SEO", icon: "search" },
  security: { label: "Security", icon: "security" },
  accessibility: { label: "Accessibility", icon: "accessibility_new" },
  responsive: { label: "Responsive", icon: "devices" },
  crawler: { label: "Crawler", icon: "hub" },
  functional: { label: "Functional", icon: "ads_click" },
  api_monitor: { label: "API Monitor", icon: "monitoring" },
  error_monitor: { label: "Errors", icon: "bug_report" },
};

export default function ScanProgressPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch(`/api/scans/${id}/status`);
        if (!r.ok) return;
        const j = (await r.json()) as Status;
        setStatus(j);
        if (j.scan.status === "completed" || j.scan.status === "failed") return;
      } catch {}
      if (!stop) setTimeout(tick, 2000);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [id]);

  useEffect(() => {
    const es = new EventSource(`/api/scans/${id}/events`);
    es.onmessage = (m) => {
      try {
        const ev: Ev = JSON.parse(m.data);
        setEvents((s) => [...s.slice(-200), ev]);
        if (ev.type === "scan.completed") {
          setTimeout(() => router.push(`/report/${id}`), 800);
          es.close();
        } else if (ev.type === "scan.failed") {
          es.close();
        }
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [id, router]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  if (!status) {
    return (
      <Shell>
        <p className="font-mono text-code-md">Loading scan {id}…</p>
      </Shell>
    );
  }

  const progress = status.scan.progress || 0;

  return (
    <Shell>
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-sans text-headline-lg">{status.scan.url}</h1>
            <div className="font-mono text-code-md text-on-surface-variant flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.scan.status === "running" ? "bg-primary animate-pulse" : status.scan.status === "completed" ? "bg-success" : status.scan.status === "failed" ? "bg-error" : "bg-on-surface-variant"}`} />
              {status.scan.status} · {progress}%
            </div>
          </div>
          <div className="font-sans text-headline-xl text-primary">{progress}%</div>
        </div>

        <div className="thin-track">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {status.scan.modules.map((m) => {
            const meta = MODULE_META[m] || { label: m, icon: "task" };
            const row = status.results.find((r) => r.module === m);
            const st = row?.status || "pending";
            const score = row?.score ?? null;
            const tone =
              st === "done" ? "bento-glow-ok" : st === "failed" ? "bento-glow-err" : st === "running" ? "bento-glow-warn" : "";
            return (
              <div key={m} className={`bento p-4 ${tone}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                    {meta.label}
                  </span>
                  <span className={`font-mono text-code-md ${st === "done" ? "text-success" : st === "failed" ? "text-error" : st === "running" ? "text-primary animate-pulse" : "text-on-surface-variant"}`}>
                    {st}
                  </span>
                </div>
                <div className="font-sans text-headline-md text-on-background">{score ?? "—"}</div>
                <div className="font-mono text-code-md text-on-surface-variant">
                  {row?.duration_ms ? `${(row.duration_ms / 1000).toFixed(1)}s` : ""}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bento p-4 mt-4">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant mb-2">Diagnostic Log</div>
          <div ref={logRef} className="h-64 overflow-auto font-mono text-code-md space-y-1">
            {events.map((e, i) => (
              <div key={i}>
                <span className="text-on-surface-variant">[{new Date(e.ts).toLocaleTimeString()}]</span>{" "}
                <span className={e.type.includes("failed") ? "text-error" : e.type.includes("completed") ? "text-success" : "text-primary"}>
                  {e.type}
                </span>
                {e.module ? <span className="text-on-background"> · {e.module}</span> : null}
                {e.message ? <span className="text-on-surface-variant"> — {e.message}</span> : null}
                {e.error ? <span className="text-error"> {e.error}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
