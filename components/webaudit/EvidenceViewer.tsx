"use client";
import { useState } from "react";

export interface Evidence {
  id: string;
  type: string;
  location: string;
  pattern: string;
  evidence?: string;
  fixSuggestion?: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface EvidenceViewerProps {
  evidences: Evidence[];
}

export default function EvidenceViewer({ evidences }: EvidenceViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const severityColors = {
    critical: "text-error bg-error/10 border-error",
    high: "text-warning bg-warning/10 border-warning",
    medium: "text-info bg-info/10 border-info",
    low: "text-on-surface-variant bg-surface-variant/10 border-outline-variant",
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-label-lg font-bold text-on-surface">Evidence Viewer</h3>
        <span className="font-mono text-code-sm text-on-surface-variant">
          {evidences.length} finding{evidences.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {evidences.map((evidence) => (
          <div
            key={evidence.id}
            className={`border-l-4 p-4 rounded-r-DEFAULT bg-surface-container-low ${
              severityColors[evidence.severity].split(" ")[2]
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`font-mono text-code-xs uppercase font-bold px-2 py-1 rounded ${severityColors[evidence.severity]}`}
                  >
                    {evidence.severity}
                  </span>
                  <span className="font-sans text-body-md font-semibold text-on-surface">
                    {evidence.type}
                  </span>
                </div>
                <div className="font-mono text-code-sm text-on-surface-variant mb-2">
                  <span className="text-primary">&gt;</span> {evidence.location}
                </div>
                {evidence.evidence && (
                  <div className="font-mono text-code-sm text-on-surface-variant mb-2 bg-surface-container p-2 rounded">
                    {evidence.evidence}
                  </div>
                )}
                {expandedId === evidence.id && evidence.fixSuggestion && (
                  <div className="mt-3 p-3 bg-primary-container/10 border border-primary-container/30 rounded">
                    <div className="font-mono text-code-xs text-primary mb-1">[FIX SUGGESTION]</div>
                    <div className="font-mono text-code-sm text-on-surface">
                      {evidence.fixSuggestion}
                    </div>
                  </div>
                )}
              </div>
              {evidence.fixSuggestion && (
                <button
                  onClick={() => setExpandedId(expandedId === evidence.id ? null : evidence.id)}
                  className="font-mono text-code-sm text-primary hover:text-primary-container transition-colors"
                >
                  {expandedId === evidence.id ? "▲" : "▼"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
