import type { ModuleKey, ModuleResult } from "../types";
import { runPerformance } from "./performance";
import { runSeo } from "./seo";
import { runSecurity } from "./security";
import { runAccessibility } from "./accessibility";
import { runResponsive } from "./responsive";
import { runCrawler } from "./crawler";
import { runFunctional } from "./functional";
import { runObservability } from "./observability";
import { scanSecrets } from "./secrets";
import { scanAIPatterns } from "./ai-patterns";
import { scanFrontendSecurity } from "./frontend-security";
import { scanDeploymentMistakes } from "./deployment-mistakes";

export type RunCtx = { scanId: string; url: string };

export async function runModule(module: ModuleKey, ctx: RunCtx): Promise<ModuleResult | ModuleResult[]> {
  switch (module) {
    case "performance":
      return runPerformance(ctx.url);
    case "seo":
      return runSeo(ctx.url);
    case "security":
      return runSecurity(ctx.url);
    case "accessibility":
      return runAccessibility(ctx.url);
    case "responsive":
      return runResponsive(ctx.url, ctx.scanId);
    case "crawler":
      return runCrawler(ctx.url);
    case "functional":
      return runFunctional(ctx.url);
    case "api_monitor": {
      const { api } = await runObservability(ctx.url);
      return api;
    }
    case "error_monitor": {
      const { errors } = await runObservability(ctx.url);
      return errors;
    }
    case "secrets": {
      const { issues, score } = await scanSecrets(ctx.url);
      return {
        module: "secrets",
        score,
        risk: score < 50 ? "high" : score < 75 ? "medium" : "low",
        data: { issues },
        issues: issues.map(i => ({
          id: i.id,
          title: i.type,
          severity: i.severity === "critical" ? "critical" : i.severity === "high" ? "warning" : "info",
          description: `${i.location}: ${i.evidence || i.pattern}`,
          fixPrompt: i.evidence,
        })),
        durationMs: 0,
      };
    }
    case "ai_patterns": {
      const { issues, score } = await scanAIPatterns(ctx.url, null as any);
      return {
        module: "ai_patterns",
        score,
        risk: score < 50 ? "high" : score < 75 ? "medium" : "low",
        data: { issues },
        issues: issues.map(i => ({
          id: i.id,
          title: i.type,
          severity: i.severity === "critical" ? "critical" : i.severity === "high" ? "warning" : "info",
          description: `${i.location}: ${i.evidence || i.pattern}`,
          fixPrompt: i.fixSuggestion,
        })),
        durationMs: 0,
      };
    }
    case "frontend_security": {
      const { issues, score } = await scanFrontendSecurity(ctx.url, null as any);
      return {
        module: "frontend_security",
        score,
        risk: score < 50 ? "high" : score < 75 ? "medium" : "low",
        data: { issues },
        issues: issues.map(i => ({
          id: i.id,
          title: i.type,
          severity: i.severity === "critical" ? "critical" : i.severity === "high" ? "warning" : "info",
          description: `${i.location}: ${i.evidence || i.pattern}`,
          fixPrompt: i.fixSuggestion,
        })),
        durationMs: 0,
      };
    }
    case "deployment_mistakes": {
      const { issues, score } = await scanDeploymentMistakes(ctx.url, null as any);
      return {
        module: "deployment_mistakes",
        score,
        risk: score < 50 ? "high" : score < 75 ? "medium" : "low",
        data: { issues },
        issues: issues.map(i => ({
          id: i.id,
          title: i.type,
          severity: i.severity === "critical" ? "critical" : i.severity === "high" ? "warning" : "info",
          description: `${i.location}: ${i.evidence || i.pattern}`,
          fixPrompt: i.fixSuggestion,
        })),
        durationMs: 0,
      };
    }
    default:
      throw new Error(`Unknown module: ${module}`);
  }
}
