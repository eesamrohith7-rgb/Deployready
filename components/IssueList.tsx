"use client";
import { useState } from "react";
import { Copy, Check, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Issue } from "@/lib/types";

function SeverityChip({ s }: { s: Issue["severity"] }) {
  if (s === "critical")
    return (
      <span className="chip critical">
        <AlertCircle size={12} /> Critical
      </span>
    );
  if (s === "warning")
    return (
      <span className="chip warning">
        <AlertTriangle size={12} /> Warning
      </span>
    );
  return (
    <span className="chip info">
      <Info size={12} /> Info
    </span>
  );
}

export default function IssueList({ issues }: { issues: Issue[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  if (!issues.length)
    return (
      <div className="card p-6 text-center text-on-surface-variant">
        No issues found. Looks ready to deploy.
      </div>
    );

  const order: Record<Issue["severity"], number> = { critical: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((i) => {
        const open = openId === i.id;
        return (
          <div key={i.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityChip s={i.severity} />
                  <span className="text-xs text-on-surface-variant">{i.category}</span>
                </div>
                <h4 className="font-semibold mt-2">{i.title}</h4>
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap mt-1">
                  {i.description}
                </p>
              </div>
              <button
                className="btn btn-ghost text-xs shrink-0 no-print"
                onClick={() => setOpenId(open ? null : i.id)}
              >
                {open ? "Hide" : "AI Fix Prompt"}
              </button>
            </div>
            {open && (
              <div className="mt-3 border border-border rounded-lg bg-black/40 no-print">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs text-on-surface-variant">
                    Paste into Claude, ChatGPT, or Cascade
                  </span>
                  <button
                    className="btn btn-ghost text-xs py-1 px-2"
                    onClick={() => copy(i.id, i.fixPrompt)}
                  >
                    {copied === i.id ? (
                      <>
                        <Check size={14} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs p-3 overflow-auto whitespace-pre-wrap font-mono text-white/90">
                  {i.fixPrompt}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
