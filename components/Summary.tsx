import type { AnalysisResult } from "@/lib/types";

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "bad" | "warn" }) {
  const color =
    tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : tone === "warn" ? "text-yellow-300" : "text-white";
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-on-surface-variant">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

export default function Summary({ result }: { result: AnalysisResult }) {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const i of result.issues) counts[i.severity]++;

  if (result.kind === "url") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Status" value={result.online ? `Online (${result.statusCode})` : "Offline"} tone={result.online ? "good" : "bad"} />
        <Stat
          label="SSL"
          value={result.ssl.valid ? `Valid (${result.ssl.daysRemaining ?? "?"}d left)` : "Invalid"}
          tone={result.ssl.valid ? "good" : "bad"}
        />
        <Stat
          label="Load Time"
          value={result.loadTimeMs ? `${result.loadTimeMs} ms` : "—"}
          tone={(result.loadTimeMs ?? 0) < 1500 ? "good" : (result.loadTimeMs ?? 0) < 3000 ? "warn" : "bad"}
        />
        <Stat
          label="Mobile"
          value={result.mobileFriendly.viewport ? "Viewport OK" : "No viewport"}
          tone={result.mobileFriendly.viewport ? "good" : "bad"}
        />
        <Stat label="Critical" value={String(counts.critical)} tone={counts.critical ? "bad" : "good"} />
        <Stat label="Warnings" value={String(counts.warning)} tone={counts.warning ? "warn" : "good"} />
        <Stat label="Info" value={String(counts.info)} />
        <Stat label="Total Issues" value={String(result.issues.length)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Files scanned" value={String(result.fileCount)} />
      <Stat label="Stack" value={result.detectedStack.join(", ") || "Unknown"} />
      <Stat label="Missing files" value={String(result.missingFiles.length)} tone={result.missingFiles.length ? "bad" : "good"} />
      <Stat label="Missing deps" value={String(result.missingDeps.length)} tone={result.missingDeps.length ? "bad" : "good"} />
      <Stat label="Broken imports" value={String(result.brokenImports.length)} tone={result.brokenImports.length ? "bad" : "good"} />
      <Stat label="Critical" value={String(counts.critical)} tone={counts.critical ? "bad" : "good"} />
      <Stat label="Warnings" value={String(counts.warning)} tone={counts.warning ? "warn" : "good"} />
      <Stat label="Info" value={String(counts.info)} />
    </div>
  );
}
