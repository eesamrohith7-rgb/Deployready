"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/webaudit/Shell";

export default function MonitorPage() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [cron, setCron] = useState("0 */6 * * *");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/monitors");
    if (r.ok) {
      const j = await r.json();
      setMonitors(j.monitors || []);
    }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/monitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, cron }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setUrl("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-sans text-headline-lg mb-4">Continuous Monitoring</h1>
      <p className="font-mono text-code-md text-on-surface-variant mb-6">
        Schedule recurring audits. Alerts fire on downtime, perf regressions &gt; 20%, SSL expiry &lt; 30 days, or API failure rate &gt; 5%.
      </p>

      <form onSubmit={add} className="bento p-4 flex flex-col md:flex-row gap-2 mb-6">
        <input className="input md:flex-1" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <input className="input md:w-56" placeholder="cron e.g. 0 */6 * * *" value={cron} onChange={(e) => setCron(e.target.value)} />
        <button className="btn btn-primary md:w-40" disabled={busy}>{busy ? "..." : "Add monitor"}</button>
      </form>
      {err && <p className="text-error font-mono text-code-md mb-3">{err}</p>}

      <div className="bento divide-y divide-outline-variant">
        {monitors.length === 0 && <div className="p-4 font-mono text-code-md text-on-surface-variant">No monitors yet.</div>}
        {monitors.map((m) => (
          <div key={m.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="font-mono text-code-md">{m.url}</div>
              <div className="font-mono text-code-md text-on-surface-variant">cron: {m.cron} · modules: {m.modules.join(", ")}</div>
            </div>
            <div className="font-mono text-code-md text-on-surface-variant">
              last run: {m.last_run_at ? new Date(m.last_run_at).toLocaleString() : "—"}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
