import type { ModuleIssue } from "../types";

export interface SecurityInput {
  isHttps: boolean;
  certDaysRemaining?: number;
  hstsPresent: boolean;
  cspPresent: boolean;
  xctoPresent: boolean;
  xfoOrFramesAncestorsPresent: boolean;
  referrerPresent: boolean;
  permissionsPresent: boolean;
  exposedPaths: string[];
}

export function deriveSecurityIssues(s: SecurityInput): ModuleIssue[] {
  const issues: ModuleIssue[] = [];
  if (!s.isHttps) issues.push({ id: "sec-https", title: "Not served over HTTPS", severity: "critical" });
  if (s.isHttps && s.certDaysRemaining !== undefined && s.certDaysRemaining < 14) {
    issues.push({ id: "sec-ssl-expiry", title: `SSL certificate expires in ${s.certDaysRemaining} days`, severity: "critical" });
  }
  if (!s.hstsPresent) issues.push({ id: "sec-hsts", title: "Missing Strict-Transport-Security", severity: "warning" });
  if (!s.cspPresent) issues.push({ id: "sec-csp", title: "Missing Content-Security-Policy", severity: "warning" });
  if (!s.xctoPresent) issues.push({ id: "sec-xcto", title: "Missing X-Content-Type-Options", severity: "warning" });
  if (!s.xfoOrFramesAncestorsPresent) issues.push({ id: "sec-xfo", title: "Missing X-Frame-Options / frame-ancestors", severity: "warning" });
  if (!s.referrerPresent) issues.push({ id: "sec-ref", title: "Missing Referrer-Policy", severity: "info" });
  if (!s.permissionsPresent) issues.push({ id: "sec-perm", title: "Missing Permissions-Policy", severity: "info" });
  if (s.exposedPaths.length) {
    issues.push({
      id: "sec-exposed",
      title: `Sensitive file exposed: ${s.exposedPaths.join(", ")}`,
      severity: "critical",
    });
  }
  return issues;
}
