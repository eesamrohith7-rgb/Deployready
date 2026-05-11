import { Page } from "playwright";

export interface SecretIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  pattern: string;
  location: string;
  evidence?: string;
}

const SECRET_PATTERNS = [
  { name: "OpenAI API Key", pattern: /sk-[a-zA-Z0-9]{48}/, severity: "critical" as const },
  { name: "Firebase Config", pattern: /firebaseio\.com|firebaseapp\.com/i, severity: "high" as const },
  { name: "Stripe Key", pattern: /sk_live_[a-zA-Z0-9]{24,}/, severity: "critical" as const },
  { name: "AWS Key", pattern: /AKIA[0-9A-Z]{16}/, severity: "critical" as const },
  { name: "Supabase Key", pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/i, severity: "high" as const },
  { name: "Environment Variable", pattern: /process\.env\.|NEXT_PUBLIC_|REACT_APP_/i, severity: "medium" as const },
  { name: "API Key", pattern: /api[_-]?key["']?\s*[:=]\s*["']?[a-zA-Z0-9]{32,}/i, severity: "high" as const },
  { name: "Bearer Token", pattern: /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i, severity: "high" as const },
];

export async function scanSecrets(url: string): Promise<{ issues: SecretIssue[]; score: number }> {
  const issues: SecretIssue[] = [];
  
  try {
    // Fetch the main page
    const response = await fetch(url);
    const html = await response.text();
    
    // Check for secrets in HTML
    SECRET_PATTERNS.forEach(({ name, pattern, severity }) => {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach((match: string, idx: number) => {
          issues.push({
            id: `secret-${name}-${idx}`,
            severity,
            type: name,
            pattern: pattern.source,
            location: "HTML Response",
            evidence: match.substring(0, 50) + (match.length > 50 ? "..." : ""),
          });
        });
      }
    });
    
    // Check for source maps
    if (html.includes('sourceMappingURL') || html.includes('.map')) {
      issues.push({
        id: "sourcemap-exposed",
        severity: "high",
        type: "Source Map Exposed",
        pattern: "sourceMappingURL|\\.map",
        location: "HTML Response",
        evidence: "Source map references found in HTML",
      });
    }
    
    // Check for .env file exposure
    try {
      const envResponse = await fetch(new URL("/.env", url));
      if (envResponse.ok) {
        issues.push({
          id: "env-file-exposed",
          severity: "critical",
          type: ".env File Exposed",
          pattern: "/\\.env",
          location: "/.env endpoint",
          evidence: ".env file is publicly accessible",
        });
      }
    } catch {
      // .env not exposed, which is good
    }
    
    // Check for git metadata
    try {
      const gitResponse = await fetch(new URL("/.git/config", url));
      if (gitResponse.ok) {
        issues.push({
          id: "git-metadata-exposed",
          severity: "critical",
          type: "Git Metadata Exposed",
          pattern: "/\\.git",
          location: "/.git/config endpoint",
          evidence: "Git repository metadata is publicly accessible",
        });
      }
    } catch {
      // Git not exposed, which is good
    }
    
    // Check for common debug endpoints
    const debugEndpoints = ["/debug", "/test", "/staging", "/admin", "/api/debug"];
    for (const endpoint of debugEndpoints) {
      try {
        const debugResponse = await fetch(new URL(endpoint, url));
        if (debugResponse.ok) {
          issues.push({
            id: `debug-endpoint-${endpoint.replace(/\//g, "-")}`,
            severity: "medium",
            type: "Debug Endpoint Exposed",
            pattern: endpoint,
            location: endpoint,
            evidence: `Debug endpoint ${endpoint} is accessible`,
          });
        }
      } catch {
        // Endpoint not accessible
      }
    }
    
  } catch (error) {
    console.error("Error scanning secrets:", error);
  }
  
  // Calculate score based on severity
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;
  
  const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2));
  
  return { issues, score };
}
