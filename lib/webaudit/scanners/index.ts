import type { ModuleKey, ModuleResult } from "../types";
import { runPerformance } from "./performance";
import { runSeo } from "./seo";
import { runSecurity } from "./security";
import { runAccessibility } from "./accessibility";
import { runResponsive } from "./responsive";
import { runCrawler } from "./crawler";
import { runFunctional } from "./functional";
import { runObservability } from "./observability";

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
    default:
      throw new Error(`Unknown module: ${module}`);
  }
}
