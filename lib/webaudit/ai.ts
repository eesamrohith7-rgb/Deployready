import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;
function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

export type AiInsight = {
  summary: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  fix: string;
  impact: string;
  priority: number; // 1 (highest) - 5 (lowest)
};

export async function generateInsights(args: {
  module: string;
  url: string;
  data: unknown;
}): Promise<AiInsight[]> {
  const c = getClient();
  if (!c) {
    logger.warn({ module: args.module }, "ANTHROPIC_API_KEY not set; returning heuristic insights");
    return heuristicInsights(args.module, args.data);
  }
  const prompt = `You are an expert web reliability auditor. Given the JSON results of the "${args.module}" module for ${args.url}, produce 3-6 actionable insights.
Return STRICT JSON: an array of objects with keys: summary, severity (info|low|medium|high|critical), fix, impact, priority (1-5).
No markdown, no prose outside JSON. Module data:\n${JSON.stringify(args.data).slice(0, 12_000)}`;

  try {
    const resp = await c.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n")
      .trim();
    const json = extractJson(text);
    if (Array.isArray(json)) return json as AiInsight[];
    return heuristicInsights(args.module, args.data);
  } catch (e) {
    logger.error({ err: e, module: args.module }, "AI insights failed");
    return heuristicInsights(args.module, args.data);
  }
}

function extractJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {}
  const m = t.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

function heuristicInsights(module: string, data: any): AiInsight[] {
  // Fallback when no LLM key is present
  const out: AiInsight[] = [];
  if (data?.score !== undefined && data.score < 60) {
    out.push({
      summary: `${module} score is low (${data.score}/100).`,
      severity: data.score < 30 ? "critical" : "high",
      fix: `Review the failing audits and address top blockers in ${module}.`,
      impact: "User experience and quality signals degraded.",
      priority: 1,
    });
  }
  if (Array.isArray(data?.issues)) {
    for (const i of data.issues.slice(0, 3)) {
      out.push({
        summary: i.title || i.id || "Issue detected",
        severity: i.severity === "critical" ? "critical" : i.severity === "warning" ? "medium" : "low",
        fix: i.fixPrompt || "Investigate and remediate.",
        impact: i.description || "—",
        priority: i.severity === "critical" ? 1 : 3,
      });
    }
  }
  if (!out.length) {
    out.push({
      summary: `${module} completed without explicit blockers.`,
      severity: "info",
      fix: "Continue monitoring; consider stricter thresholds.",
      impact: "Baseline quality maintained.",
      priority: 5,
    });
  }
  return out;
}
