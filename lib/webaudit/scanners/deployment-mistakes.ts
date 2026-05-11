import { Page } from "playwright";

export interface DeploymentMistakeIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  pattern: string;
  location: string;
  evidence?: string;
  fixSuggestion?: string;
}

const STAGING_PATTERNS = [
  { pattern: /staging|dev|test|preview|demo/i, severity: "medium" as const },
  { pattern: /vercel\.app\/preview|next\.js\/|localhost/i, severity: "high" as const },
];

const STORAGE_PATTERNS = [
  { pattern: /s3\.amazonaws\.com|storage\.googleapis\.com|blob\.core\.windows\.net/i, severity: "high" as const },
  { pattern: /public|unauthenticated|no-auth/i, severity: "critical" as const },
];

export async function scanDeploymentMistakes(url: string, page: Page): Promise<{ issues: DeploymentMistakeIssue[]; score: number }> {
  const issues: DeploymentMistakeIssue[] = [];
  
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    const content = await page.content();
    
    // Check for staging/preview URLs
    STAGING_PATTERNS.forEach(({ pattern, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match: string, idx: number) => {
          issues.push({
            id: `staging-pattern-${idx}`,
            severity,
            type: "Possible Staging Environment Exposed",
            pattern: pattern.source,
            location: "Page content",
            evidence: match,
            fixSuggestion: "Ensure staging environments are properly secured or restricted",
          });
        });
      }
    });
    
    // Check for public storage buckets
    STORAGE_PATTERNS.forEach(({ pattern, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match: string, idx: number) => {
          issues.push({
            id: `storage-pattern-${idx}`,
            severity,
            type: "Possible Public Storage Bucket",
            pattern: pattern.source,
            location: "Page content",
            evidence: match,
            fixSuggestion: "Restrict storage bucket access and enable proper authentication",
          });
        });
      }
    });
    
    // Check for common subdomain patterns that might be exposed
    const subdomainPatterns = [
      { pattern: /dev\.|staging\.|test\.|preview\.|admin\.|api\./i, severity: "medium" as const },
    ];
    
    subdomainPatterns.forEach(({ pattern, severity }) => {
      const urlMatch = url.match(pattern);
      if (urlMatch) {
        issues.push({
          id: "subdomain-pattern",
          severity,
          type: "Sensitive Subdomain Pattern",
          pattern: pattern.source,
          location: "URL",
          evidence: urlMatch[0],
          fixSuggestion: "Review subdomain security and access controls",
        });
      }
    });
    
    // Check for missing HTTPS enforcement
    if (!url.startsWith('https://')) {
      issues.push({
        id: "missing-https",
        severity: "critical",
        type: "Missing HTTPS Enforcement",
        pattern: "^http://",
        location: "URL",
        evidence: "Site is not using HTTPS",
        fixSuggestion: "Enable HTTPS with HSTS header and redirect HTTP to HTTPS",
      });
    }
    
    // Check for broken auth flows
    const hasAuthIndicators = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return body.toLowerCase().includes('login') || 
             body.toLowerCase().includes('sign in') ||
             body.toLowerCase().includes('auth') ||
             document.querySelector('input[type="password"]') !== null;
    });
    
    if (hasAuthIndicators) {
      // Check if auth is properly implemented
      const hasSecureAuth = await page.evaluate(() => {
        const cookies = document.cookie;
        return cookies.includes('HttpOnly') || cookies.includes('Secure');
      });
      
      if (!hasSecureAuth) {
        issues.push({
          id: "insecure-auth",
          severity: "high",
          type: "Insecure Authentication Cookies",
          pattern: "cookie.*HttpOnly|Secure",
          location: "Cookies",
          evidence: "Auth cookies may not have HttpOnly or Secure flags",
          fixSuggestion: "Add HttpOnly and Secure flags to authentication cookies",
        });
      }
    }
    
    // Check for open redirects
    const redirectParams = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .map(a => a.getAttribute('href'))
        .filter(href => href && (href.includes('redirect=') || href.includes('next=') || href.includes('return=')));
    });
    
    if (redirectParams.length > 0) {
      issues.push({
        id: "open-redirect",
        severity: "medium",
        type: "Possible Open Redirect",
        pattern: "redirect=|next=|return=",
        location: "Links",
        evidence: `${redirectParams.length} links with redirect parameters`,
        fixSuggestion: "Validate and whitelist redirect URLs to prevent open redirect attacks",
      });
    }
    
    // Check for exposed debug information
    const debugInfo = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return body.includes('DEBUG') || 
             body.includes('development mode') ||
             body.includes('stack trace');
    });
    
    if (debugInfo) {
      issues.push({
        id: "debug-info-exposed",
        severity: "medium",
        type: "Debug Information Exposed",
        pattern: "DEBUG|development mode|stack trace",
        location: "Page content",
        evidence: "Debug-related text found in production",
        fixSuggestion: "Remove debug information from production builds",
      });
    }
    
  } catch (error) {
    console.error("Error scanning deployment mistakes:", error);
  }
  
  // Calculate score based on severity
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;
  
  const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2));
  
  return { issues, score };
}
