import { Page } from "playwright";

export interface FrontendSecurityIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  pattern: string;
  location: string;
  evidence?: string;
  fixSuggestion?: string;
}

export async function scanFrontendSecurity(url: string, page: Page): Promise<{ issues: FrontendSecurityIssue[]; score: number }> {
  const issues: FrontendSecurityIssue[] = [];
  
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    // Get response headers
    const response = await page.goto(url);
    const headers = response?.headers() || {};
    
    // Check CSP
    const csp = headers['content-security-policy'];
    if (!csp) {
      issues.push({
        id: "missing-csp",
        severity: "high",
        type: "Missing Content Security Policy",
        pattern: "Content-Security-Policy",
        location: "Response Headers",
        evidence: "No CSP header found",
        fixSuggestion: "Add a Content-Security-Policy header to restrict resource loading",
      });
    } else {
      // Check for unsafe CSP directives
      if (csp.includes("unsafe-inline") || csp.includes("unsafe-eval")) {
        issues.push({
          id: "unsafe-csp",
          severity: "medium",
          type: "Unsafe CSP Directives",
          pattern: "unsafe-inline|unsafe-eval",
          location: "Content-Security-Policy header",
          evidence: "CSP contains unsafe-inline or unsafe-eval",
          fixSuggestion: "Remove unsafe-inline and unsafe-eval from CSP for better security",
        });
      }
    }
    
    // Check X-Frame-Options
    const xfo = headers['x-frame-options'];
    if (!xfo) {
      issues.push({
        id: "missing-xfo",
        severity: "medium",
        type: "Missing X-Frame-Options",
        pattern: "X-Frame-Options",
        location: "Response Headers",
        evidence: "No X-Frame-Options header found",
        fixSuggestion: "Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking",
      });
    }
    
    // Check X-Content-Type-Options
    const xcto = headers['x-content-type-options'];
    if (!xcto) {
      issues.push({
        id: "missing-xcto",
        severity: "low",
        type: "Missing X-Content-Type-Options",
        pattern: "X-Content-Type-Options",
        location: "Response Headers",
        evidence: "No X-Content-Type-Options header found",
        fixSuggestion: "Add X-Content-Type-Options: nosniff to prevent MIME sniffing",
      });
    }
    
    // Check CORS
    const cors = headers['access-control-allow-origin'];
    if (cors && cors === '*') {
      issues.push({
        id: "permissive-cors",
        severity: "high",
        type: "Permissive CORS Policy",
        pattern: "Access-Control-Allow-Origin: *",
        location: "Response Headers",
        evidence: "CORS allows all origins",
        fixSuggestion: "Restrict CORS to specific origins instead of wildcard",
      });
    }
    
    // Check for HTTPS
    if (!url.startsWith('https://')) {
      issues.push({
        id: "no-https",
        severity: "critical",
        type: "Not Using HTTPS",
        pattern: "^http://",
        location: "URL",
        evidence: "Site is not using HTTPS",
        fixSuggestion: "Enable HTTPS with a valid SSL certificate",
      });
    }
    
    // Check for dangerous innerHTML usage
    const hasInnerHTML = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some(s => s.textContent?.includes('.innerHTML') || s.textContent?.includes('dangerouslySetInnerHTML'));
    });
    
    if (hasInnerHTML) {
      issues.push({
        id: "dangerous-innerhtml",
        severity: "high",
        type: "Dangerous innerHTML Usage",
        pattern: "\\.innerHTML|dangerouslySetInnerHTML",
        location: "JavaScript files",
        evidence: "innerHTML or dangerouslySetInnerHTML found in code",
        fixSuggestion: "Use textContent or DOM methods instead of innerHTML to prevent XSS",
      });
    }
    
    // Check for eval usage
    const hasEval = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some(s => s.textContent?.includes('eval(') || s.textContent?.includes('new Function('));
    });
    
    if (hasEval) {
      issues.push({
        id: "eval-usage",
        severity: "high",
        type: "eval() Usage",
        pattern: "eval\\(|new Function\\(",
        location: "JavaScript files",
        evidence: "eval() or new Function() found in code",
        fixSuggestion: "Avoid eval() and new Function() to prevent code injection attacks",
      });
    }
    
    // Check for mixed content
    if (url.startsWith('https://')) {
      const mixedContent = await page.evaluate(() => {
        const resources = Array.from(document.querySelectorAll('img, script, link, iframe'));
        return resources.some(r => {
          const src = r.getAttribute('src') || r.getAttribute('href');
          return src && src.startsWith('http://');
        });
      });
      
      if (mixedContent) {
        issues.push({
          id: "mixed-content",
          severity: "medium",
          type: "Mixed Content",
          pattern: "http://.*https",
          location: "Page resources",
          evidence: "HTTP resources on HTTPS page",
          fixSuggestion: "Update all resources to use HTTPS",
        });
      }
    }
    
    // Check for exposed stack traces
    const hasStackTrace = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return body.includes('Error:') || body.includes('at ') || body.includes('Stack trace');
    });
    
    if (hasStackTrace) {
      issues.push({
        id: "exposed-stack-trace",
        severity: "medium",
        type: "Exposed Stack Trace",
        pattern: "Error:|at |Stack trace",
        location: "Page content",
        evidence: "Stack trace or error details visible in page",
        fixSuggestion: "Disable stack traces in production environment",
      });
    }
    
  } catch (error) {
    console.error("Error scanning frontend security:", error);
  }
  
  // Calculate score based on severity
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;
  
  const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2));
  
  return { issues, score };
}
