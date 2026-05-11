"use client";

interface ReadinessBadgeProps {
  score: number;
  criticalIssues: number;
  highIssues: number;
}

export default function ReadinessBadge({ score, criticalIssues, highIssues }: ReadinessBadgeProps) {
  let status: "ready" | "warning" | "critical";
  let label: string;
  let color: string;

  if (criticalIssues > 0 || score < 50) {
    status = "critical";
    label = "CRITICAL";
    color = "text-error bg-error/10 border-error";
  } else if (highIssues > 0 || score < 75) {
    status = "warning";
    label = "WARNING";
    color = "text-warning bg-warning/10 border-warning";
  } else {
    status = "ready";
    label = "READY";
    color = "text-primary bg-primary-container/10 border-primary-container";
  }

  return (
    <div className="flex items-center gap-4">
      <div className={`border-2 px-4 py-2 rounded-DEFAULT font-mono text-label-caps font-bold uppercase tracking-wider ${color}`}>
        {label}
      </div>
      <div className="flex flex-col">
        <div className="font-mono text-code-sm text-on-surface-variant">Security Score</div>
        <div className="font-sans text-headline-md font-bold text-on-surface">
          {score}/100
        </div>
      </div>
      {criticalIssues > 0 && (
        <div className="font-mono text-code-sm text-error">
          {criticalIssues} critical
        </div>
      )}
      {highIssues > 0 && (
        <div className="font-mono text-code-sm text-warning">
          {highIssues} high
        </div>
      )}
    </div>
  );
}
