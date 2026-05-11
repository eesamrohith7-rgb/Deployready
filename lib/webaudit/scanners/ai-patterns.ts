import { Page } from "playwright";

export interface AIPatternIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  pattern: string;
  location: string;
  evidence?: string;
  fixSuggestion?: string;
}

const AI_PATTERNS = [
  {
    name: "ChatGPT Boilerplate",
    pattern: /I (?:can help|will|am an AI|apologize for the confusion|understand you want)/i,
    severity: "low" as const,
    fixSuggestion: "Remove AI-generated boilerplate text from production code",
  },
  {
    name: "Cursor Auth Pattern",
    pattern: /@clerk\/nextjs|next-auth|authjs/i,
    severity: "medium" as const,
    fixSuggestion: "Review auth implementation - ensure proper security measures",
  },
  {
    name: "Lovable/Replit/V0 Pattern",
    pattern: /lovable|replit|v0\.dev|stackblitz/i,
    severity: "medium" as const,
    fixSuggestion: "Review deployment configuration - ensure proper production setup",
  },
  {
    name: "Exposed API Route",
    pattern: /api\/route\.(ts|js)|route\.ts|route\.js/i,
    severity: "high" as const,
    fixSuggestion: "Add authentication and rate limiting to API routes",
  },
  {
    name: "Missing Rate Limit",
    pattern: /await.*fetch\(|axios\(|get\(|post\(/i,
    severity: "high" as const,
    fixSuggestion: "Add rate limiting to all API calls",
  },
  {
    name: "Unsafe Server Action",
    pattern: /"use server"/i,
    severity: "medium" as const,
    fixSuggestion: "Add authentication checks to server actions",
  },
  {
    name: "Client Side Secret",
    pattern: /NEXT_PUBLIC_|REACT_APP_|VITE_/i,
    severity: "critical" as const,
    fixSuggestion: "Move sensitive values to server-side environment variables",
  },
  {
    name: "Insecure Middleware",
    pattern: /middleware\.(ts|js)/i,
    severity: "high" as const,
    fixSuggestion: "Review middleware security - ensure proper auth checks",
  },
  {
    name: "Public Environment Variable",
    pattern: /process\.env\./i,
    severity: "high" as const,
    fixSuggestion: "Ensure no secrets are exposed to client-side code",
  },
  {
    name: "Default Credentials",
    pattern: /admin|password|secret|token/i,
    severity: "medium" as const,
    fixSuggestion: "Replace default credentials with secure alternatives",
  },
];

export async function scanAIPatterns(url: string, page: Page): Promise<{ issues: AIPatternIssue[]; score: number }> {
  const issues: AIPatternIssue[] = [];
  
  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    // Get page content
    const content = await page.content();
    const jsContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map(s => s.getAttribute('src')).join('\n');
    });
    
    // Check for AI-generated patterns
    AI_PATTERNS.forEach(({ name, pattern, severity, fixSuggestion }) => {
      const matches = content.match(pattern) || jsContent.match(pattern);
      if (matches) {
        matches.forEach((match: string, idx: number) => {
          issues.push({
            id: `ai-pattern-${name}-${idx}`,
            severity,
            type: name,
            pattern: pattern.source,
            location: "Page Content / Scripts",
            evidence: match.substring(0, 50) + (match.length > 50 ? "..." : ""),
            fixSuggestion,
          });
        });
      }
    });
    
    // Check for exposed bundle files
    const bundleFiles = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts
        .map(s => s.getAttribute('src'))
        .filter(src => src && (src.includes('.js') || src.includes('chunk')));
    });
    
    if (bundleFiles.length > 0) {
      bundleFiles.forEach((file, idx) => {
        issues.push({
          id: `bundle-exposed-${idx}`,
          severity: "medium",
          type: "Bundle File Exposed",
          pattern: "\\.js$|chunk",
          location: file || "unknown",
          evidence: "JavaScript bundle file is publicly accessible",
          fixSuggestion: "Consider code splitting and minification to reduce exposure",
        });
      });
    }
    
    // Check for console.log in production
    const hasConsoleLogs = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some(s => s.textContent?.includes('console.log') || s.textContent?.includes('console.error'));
    });
    
    if (hasConsoleLogs) {
      issues.push({
        id: "console-logs",
        severity: "low",
        type: "Console Logs in Production",
        pattern: "console\\.(log|error|warn)",
        location: "JavaScript files",
        evidence: "Console logging statements found in production code",
        fixSuggestion: "Remove console.log statements before deployment",
      });
    }
    
  } catch (error) {
    console.error("Error scanning AI patterns:", error);
  }
  
  // Calculate score based on severity
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;
  
  const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2));
  
  return { issues, score };
}
