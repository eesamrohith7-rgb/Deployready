export type Severity = "info" | "warning" | "critical";
export type Risk = "low" | "medium" | "high" | "critical";

export interface ModuleIssue {
  id: string;
  title: string;
  severity: Severity;
  description?: string;
  fixPrompt?: string;
}

export interface ModuleResult {
  module: ModuleKey;
  score?: number; // 0..100
  risk?: Risk;
  data: Record<string, any>;
  issues: ModuleIssue[];
  durationMs: number;
}

export type ModuleKey =
  | "performance"
  | "seo"
  | "security"
  | "accessibility"
  | "responsive"
  | "crawler"
  | "functional"
  | "api_monitor"
  | "error_monitor"
  | "secrets"
  | "ai_patterns"
  | "frontend_security"
  | "deployment_mistakes";

export const ALL_MODULES: ModuleKey[] = [
  "performance",
  "seo",
  "security",
  "accessibility",
  "responsive",
  "crawler",
  "functional",
  "api_monitor",
  "error_monitor",
  "secrets",
  "ai_patterns",
  "frontend_security",
  "deployment_mistakes",
];

export interface ScanEvent {
  type: "scan.started" | "module.started" | "module.progress" | "module.done" | "module.failed" | "scan.completed" | "scan.failed";
  scanId: string;
  module?: ModuleKey;
  progress?: number;
  message?: string;
  result?: ModuleResult;
  error?: string;
  ts: string;
}
