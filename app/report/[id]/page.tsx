"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/webaudit/Shell";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
} from "recharts";

type Result = {
  module: string;
  status: string;
  score: number | null;
  risk: string | null;
  data: any;
  ai_insights: any[] | null;
  duration_ms: number | null;
};

type Resp = {
  scan: { id: string; url: string; status: string; overall_score: number | null; modules: string[]; started_at: string; finished_at: string };
  results: Result[];
};

const MODULES = ["performance", "seo", "security", "accessibility", "responsive", "crawler", "functional", "api_monitor", "error_monitor"];

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Resp | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`).then((r) => r.json()).then(setD);
  }, [id]);

  if (!d) return <Shell><p className="font-mono text-code-md">Loading…</p></Shell>;

  const radar = MODULES.map((m) => ({
    module: m.replace("_", " "),
    score: d.results.find((r) => r.module === m)?.score ?? 0,
  }));
  const bars = d.results.map((r) => ({ module: r.module, score: r.score ?? 0 }));

  return (
    <Shell>
      <section className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="font-sans text-headline-lg">{d.scan.url}</h1>
          <div className="font-mono text-code-md text-on-surface-variant">
            scan {d.scan.id} · finished {d.scan.finished_at ? new Date(d.scan.finished_at).toLocaleString() : "—"}
          </div>
        </div>
        <div className="flex gap-3">
          <a href={`/api/reports/${d.scan.id}?format=csv`} className="btn btn-ghost">CSV</a>
          <a href={`/api/reports/${d.scan.id}`} className="btn btn-ghost">JSON</a>
          <a href={`/api/reports/${d.scan.id}/pdf`} className="btn btn-primary">PDF</a>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 bento p-6 flex flex-col items-center justify-center min-h-[260px]">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant mb-3">Overall</div>
          <div className="font-sans text-[80px] leading-none text-primary">{d.scan.overall_score ?? "—"}</div>
          <div className="font-mono text-code-md text-on-surface-variant">/100</div>
        </div>
        <div className="md:col-span-8 bento p-4 min-h-[260px]">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant mb-2">Category scores</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bars}>
              <CartesianGrid stroke="#1f1f1f" />
              <XAxis dataKey="module" stroke="#a58c7d" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#a58c7d" />
              <Tooltip />
              <Bar dataKey="score" fill="#f38020" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="md:col-span-6 bento p-4 min-h-[300px]">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant mb-2">Radar profile</div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radar}>
              <PolarGrid stroke="#1f1f1f" />
              <PolarAngleAxis dataKey="module" stroke="#a58c7d" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="score" dataKey="score" stroke="#f38020" fill="#f38020" fillOpacity={0.35} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="md:col-span-6 bento p-4 min-h-[300px]">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant mb-2">Module summary</div>
          <table className="w-full font-mono text-code-md">
            <thead className="text-on-surface-variant">
              <tr><th className="text-left">Module</th><th className="text-left">Status</th><th className="text-right">Score</th><th className="text-right">Duration</th></tr>
            </thead>
            <tbody>
              {d.results.map((r) => (
                <tr key={r.module} className="border-t border-outline-variant/40">
                  <td className="py-1">{r.module}</td>
                  <td className={r.status === "failed" ? "text-error" : r.status === "done" ? "text-success" : "text-on-surface-variant"}>{r.status}</td>
                  <td className="text-right text-primary">{r.score ?? "—"}</td>
                  <td className="text-right text-on-surface-variant">{r.duration_ms ? (r.duration_ms / 1000).toFixed(1) + "s" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Screenshots */}
      {d.results.find((r) => r.module === "responsive")?.data?.screenshots?.length ? (
        <section className="mt-6">
          <h2 className="font-sans text-headline-md mb-3">Responsive screenshots</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {d.results.find((r) => r.module === "responsive")!.data.screenshots.map((s: any) => (
              <figure key={s.label} className="bento p-3">
                <img src={s.path} alt={s.label} className="w-full rounded" />
                <figcaption className="font-mono text-code-md text-on-surface-variant mt-2 flex justify-between">
                  <span>{s.label}</span>
                  <span className={s.overflowX ? "text-error" : "text-success"}>{s.overflowX ? "overflow" : "ok"}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* AI insights */}
      <section className="mt-6">
        <h2 className="font-sans text-headline-md mb-3">AI Insights</h2>
        <div className="flex flex-col gap-3">
          {d.results.flatMap((r) =>
            (r.ai_insights || []).slice(0, 3).map((ins: any, i: number) => (
              <div key={`${r.module}-${i}`} className="bento p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant">
                    {r.module} · priority {ins.priority}
                  </span>
                  <span className={`font-mono text-code-md ${
                    ins.severity === "critical" ? "text-error" :
                    ins.severity === "high" ? "text-warning" :
                    ins.severity === "medium" ? "text-primary" : "text-on-surface-variant"
                  }`}>{ins.severity}</span>
                </div>
                <div className="font-sans text-body-md text-on-background">{ins.summary}</div>
                <div className="font-mono text-code-md text-on-surface-variant mt-2"><b className="text-primary">Fix:</b> {ins.fix}</div>
                <div className="font-mono text-code-md text-on-surface-variant"><b className="text-primary">Impact:</b> {ins.impact}</div>
              </div>
            )),
          )}
        </div>
      </section>
    </Shell>
  );
}
