"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/webaudit/Shell";

type Scan = {
  id: string;
  url: string;
  status: string;
  progress: number;
  overall_score: number | null;
  created_at: string;
};

export default function Dashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/scans").then((r) => r.json()),
      ]);
      setProjects(a.projects || []);
      setScans(b.scans);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Shell>
      <h1 className="font-sans text-headline-lg mb-6">Dashboard</h1>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bento p-4">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant">Projects</div>
          <div className="font-sans text-headline-md">{projects.length}</div>
        </div>
        <div className="bento p-4">
          <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant">Recent Scans</div>
          <div className="font-sans text-headline-md">{scans.length}</div>
        </div>
        <div className="bento p-4 flex justify-between items-center">
          <div>
            <div className="font-mono text-label-caps uppercase tracking-wider text-on-surface-variant">Run a new audit</div>
            <div className="font-sans text-headline-md text-primary">/webaudit</div>
          </div>
          <Link href="/webaudit" className="btn btn-primary">New Scan</Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-sans text-headline-md mb-3">Recent scans</h2>
        {loading ? (
          <p className="font-mono text-code-md text-on-surface-variant">Loading…</p>
        ) : !scans.length ? (
          <p className="font-mono text-code-md text-on-surface-variant">No scans yet. <Link className="text-primary underline" href="/webaudit">Run one.</Link></p>
        ) : (
          <div className="bento divide-y divide-outline-variant">
            {scans.map((s) => (
              <Link key={s.id} href={`/report/${s.id}`} className="flex justify-between items-center p-4 hover:bg-surface-container-highest/40">
                <div className="font-mono text-code-md truncate">{s.url}</div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-code-md text-on-surface-variant">{s.status}</span>
                  <span className="font-sans text-headline-md text-primary">{s.overall_score ?? "—"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
