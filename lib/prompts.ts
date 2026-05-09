import type { Issue, Severity } from "./types";

export function makePrompt(args: {
  category: string;
  title: string;
  description: string;
  context?: string;
}): string {
  const ctx = args.context ? `\n\nContext:\n${args.context}` : "";
  return `You are an expert full-stack engineer helping me make my project deployment-ready.

Problem: ${args.title}
Category: ${args.category}
Details: ${args.description}${ctx}

Please:
1. Explain the root cause briefly.
2. Provide the exact file paths and code changes needed to fix this.
3. Include any commands I must run (install, build, env setup).
4. Keep the solution minimal and production-ready.

Return the answer as a short plan followed by the code diffs.`;
}

export function issue(
  id: string,
  severity: Severity,
  category: string,
  title: string,
  description: string,
  context?: string,
): Issue {
  return {
    id,
    severity,
    category,
    title,
    description,
    fixPrompt: makePrompt({ category, title, description, context }),
  };
}
