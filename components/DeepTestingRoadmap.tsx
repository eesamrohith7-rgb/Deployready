"use client";
import { useState } from "react";
import { ChevronDown, GraduationCap } from "lucide-react";

type Coverage = "auto" | "heuristic" | "manual";

type Item = {
  emoji: string;
  title: string;
  what: string;
  examples: string;
  tools: string;
  coverage: Coverage;
};

type Group = {
  level: 1 | 2 | 3 | 4;
  area: string;
  items: Item[];
};

const ROADMAP: Group[] = [
  {
    level: 1,
    area: "Frontend Deep Testing",
    items: [
      {
        emoji: "🖼️",
        title: "Visual Regression Testing",
        what: "Catch pixel-level UI changes (alignment, fonts, spacing, colors, animation glitches).",
        examples: "Misaligned elements, font rendering, unexpected spacing, color mismatches.",
        tools: "Percy, Chromatic, Playwright screenshots.",
        coverage: "manual",
      },
      {
        emoji: "🌳",
        title: "DOM Testing",
        what: "Verify HTML structure, hydration, and virtual-DOM behavior.",
        examples: "DOM mutations, hydration mismatch, React rendering, virtual DOM diff.",
        tools: "Testing Library, jsdom, Playwright.",
        coverage: "heuristic",
      },
      {
        emoji: "🧠",
        title: "State Management Testing",
        what: "Validate global app state behaves correctly across flows.",
        examples: "Redux, Zustand, Context API, cache invalidation.",
        tools: "Vitest/Jest, Redux DevTools, MSW.",
        coverage: "heuristic",
      },
      {
        emoji: "✨",
        title: "Micro-interaction Testing",
        what: "Verify hover, ripple, skeletons, drag-and-drop feel right.",
        examples: "Hover states, ripple effects, loading skeletons, DnD.",
        tools: "Storybook + Chromatic, Playwright.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 2,
    area: "Backend Deep Testing",
    items: [
      {
        emoji: "🔀",
        title: "Concurrency Testing",
        what: "Hammer the system with parallel requests to expose race conditions.",
        examples: "Race conditions, deadlocks, data corruption, queue failures.",
        tools: "k6, Vegeta, custom Go/Node concurrent harnesses.",
        coverage: "manual",
      },
      {
        emoji: "🗃️",
        title: "Database Stress Testing",
        what: "Push the DB until queries, indexes, or pools break.",
        examples: "Query plans, index perf, pool exhaustion, replication lag.",
        tools: "pgbench, sysbench, EXPLAIN ANALYZE, Datadog APM.",
        coverage: "manual",
      },
      {
        emoji: "🕸️",
        title: "Distributed System Testing",
        what: "Validate microservice communication and resiliency.",
        examples: "Service-to-service calls, retries, circuit breakers, event queues.",
        tools: "Istio, Toxiproxy, OpenTelemetry traces.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 3,
    area: "Security Deep Testing",
    items: [
      {
        emoji: "🛡️",
        title: "Penetration Testing",
        what: "Ethical hacking: SQLi / XSS / SSRF / RCE / broken auth / JWT attacks.",
        examples: "Injection, broken access control, JWT alg confusion.",
        tools: "Burp Suite, OWASP ZAP, sqlmap, Nuclei.",
        coverage: "manual",
      },
      {
        emoji: "📋",
        title: "OWASP Top 10",
        what: "Run the industry-standard security checklist end-to-end.",
        examples: "Broken access control, crypto failures, injection.",
        tools: "OWASP ZAP, Snyk, npm audit, Trivy.",
        coverage: "heuristic",
      },
      {
        emoji: "🔑",
        title: "Session Testing",
        what: "Audit cookies, tokens, expiry, hijacking, multi-device login.",
        examples: "Cookie flags, token expiry, session fixation.",
        tools: "Burp Suite, manual cookie inspection, Playwright.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 2,
    area: "Performance Deep Testing",
    items: [
      {
        emoji: "📊",
        title: "Core Web Vitals",
        what: "Measure Google ranking metrics on real users.",
        examples: "LCP, FID, CLS, INP.",
        tools: "Lighthouse, web-vitals lib, CrUX, PageSpeed Insights.",
        coverage: "heuristic",
      },
      {
        emoji: "🧪",
        title: "Memory Leak Testing",
        what: "Watch RAM grow over time to find leaks.",
        examples: "Listener leaks, infinite re-renders, detached DOM nodes.",
        tools: "Chrome DevTools Memory, why-did-you-render, clinic.js.",
        coverage: "manual",
      },
      {
        emoji: "🌊",
        title: "Network Waterfall Analysis",
        what: "Inspect DNS / TLS / TTFB / CDN latency per request.",
        examples: "DNS lookup, TLS handshake, TTFB, CDN cache hits.",
        tools: "Chrome DevTools Network, WebPageTest, Sitespeed.io.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 3,
    area: "Infrastructure Testing",
    items: [
      {
        emoji: "🚀",
        title: "CI/CD Pipeline Testing",
        what: "Validate build, image, rollback, env-isolation stages.",
        examples: "Build validation, Docker tests, rollback drills.",
        tools: "GitHub Actions, GitLab CI, Argo CD.",
        coverage: "heuristic",
      },
      {
        emoji: "📦",
        title: "Container Testing",
        what: "Verify Docker / K8s resource limits, scaling, health.",
        examples: "Limits, autoscaling, pod recovery, probes.",
        tools: "kubectl, k6, container-structure-test.",
        coverage: "manual",
      },
      {
        emoji: "☁️",
        title: "Cloud Testing",
        what: "Validate cloud infra config and behavior.",
        examples: "AWS, GCP, Azure resources & policies.",
        tools: "Terraform plan, AWS Config, tfsec, Checkov.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 4,
    area: "AI-Powered Testing",
    items: [
      {
        emoji: "🤖",
        title: "Self-Healing Tests",
        what: "AI repairs broken selectors and locators automatically.",
        examples: "Dynamic XPath repair, smart locators.",
        tools: "Testim, Mabl, Functionize.",
        coverage: "manual",
      },
      {
        emoji: "📡",
        title: "Synthetic Monitoring",
        what: "Bots run scripted journeys 24/7 from many regions.",
        examples: "Downtime, regional latency, payment-flow failures.",
        tools: "Datadog Synthetics, Checkly, Pingdom.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 4,
    area: "Chaos Engineering",
    items: [
      {
        emoji: "🐒",
        title: "Chaos Testing",
        what: "Intentionally break things to prove the system recovers.",
        examples: "Server kill, DB failure, network cut, API timeout.",
        tools: "Netflix Chaos Monkey, Gremlin, chaos-mesh, LitmusChaos.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 4,
    area: "Scalability Testing",
    items: [
      {
        emoji: "📈",
        title: "Scalability Testing",
        what: "Confirm the system scales horizontally and vertically.",
        examples: "Horizontal/vertical scaling, autoscaling triggers, cache scaling.",
        tools: "k6, Locust, AWS Auto Scaling, HPA on K8s.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 3,
    area: "Real User Monitoring",
    items: [
      {
        emoji: "👀",
        title: "Real User Monitoring (RUM)",
        what: "Track real users live to catch issues your tests miss.",
        examples: "Rage clicks, session replay, device analytics, crashes.",
        tools: "Sentry, Datadog RUM, New Relic, PostHog, LogRocket.",
        coverage: "heuristic",
      },
    ],
  },
  {
    level: 3,
    area: "Compliance Testing",
    items: [
      {
        emoji: "⚖️",
        title: "Compliance Testing",
        what: "Verify legal & regulatory standards are met.",
        examples: "GDPR, PCI DSS, HIPAA, accessibility laws (WCAG/ADA).",
        tools: "OneTrust, Cookiebot, axe DevTools, manual audit.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 2,
    area: "Edge Case Testing",
    items: [
      {
        emoji: "🪲",
        title: "Edge Case Testing",
        what: "Throw weird inputs and conditions at the app.",
        examples: "1-char passwords, 10MB usernames, emojis, slow net, timezones, double-click submits.",
        tools: "Property-based: fast-check, Hypothesis. Manual exploration.",
        coverage: "heuristic",
      },
    ],
  },
  {
    level: 4,
    area: "Production Testing",
    items: [
      {
        emoji: "🟢",
        title: "Production Testing",
        what: "Test live systems safely without breaking users.",
        examples: "Canary, blue-green, feature flags, shadow traffic.",
        tools: "LaunchDarkly, Unleash, Statsig, Argo Rollouts.",
        coverage: "manual",
      },
    ],
  },
  {
    level: 3,
    area: "Observability Testing",
    items: [
      {
        emoji: "🔭",
        title: "Observability Testing",
        what: "Confirm your logs, metrics, traces, and alerts are actually useful.",
        examples: "Log levels, metric cardinality, trace propagation, alert noise.",
        tools: "Datadog, Grafana, Prometheus, OpenTelemetry, Sentry.",
        coverage: "heuristic",
      },
    ],
  },
  {
    level: 3,
    area: "API Contract Testing",
    items: [
      {
        emoji: "🤝",
        title: "API Contract Testing",
        what: "Make sure frontend and backend agree on the schema, even across versions.",
        examples: "Schema mismatch, breaking changes, backward compatibility.",
        tools: "Pact, OpenAPI/Swagger, GraphQL schema diff, Spectral.",
        coverage: "heuristic",
      },
    ],
  },
  {
    level: 4,
    area: "Reliability Engineering",
    items: [
      {
        emoji: "🛟",
        title: "Reliability Engineering",
        what: "Quantify and improve how reliable the system is.",
        examples: "MTTR, SLA, SLO, error budgets.",
        tools: "Datadog, Grafana SLO, Honeycomb, Nobl9.",
        coverage: "manual",
      },
    ],
  },
];

const COVERAGE_CHIP: Record<Coverage, { label: string; cls: string }> = {
  auto: { label: "Automated here", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  heuristic: { label: "Heuristic only", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  manual: { label: "Manual only", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

const LEVEL_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Level 1 · Foundations",
  2: "Level 2 · Automation & APIs",
  3: "Level 3 · Security, CI/CD, Monitoring",
  4: "Level 4 · Distributed, Chaos, Reliability",
};

export default function DeepTestingRoadmap() {
  const [open, setOpen] = useState(false);

  // group by level
  const byLevel: Record<1 | 2 | 3 | 4, Group[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const g of ROADMAP) byLevel[g.level].push(g);

  return (
    <section className="card p-5 no-print">
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 grid place-items-center text-accent shrink-0">
          <GraduationCap size={18} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Deep Testing Roadmap</h3>
          <p className="text-sm text-on-surface-variant">
            15 testing categories used by senior teams, grouped into 4 levels.
            Click to expand. Chips tell you whether DeployReady can detect this,
            give a heuristic only, or whether it requires manual testing.
          </p>
        </div>
        <ChevronDown
          size={20}
          className={`text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-6">
          {([1, 2, 3, 4] as const).map((lvl) =>
            byLevel[lvl].length === 0 ? null : (
              <div key={lvl}>
                <h4 className="text-sm uppercase tracking-wider text-on-surface-variant mb-2">
                  {LEVEL_LABEL[lvl]}
                </h4>
                <div className="flex flex-col gap-4">
                  {byLevel[lvl].map((g) => (
                    <div key={g.area}>
                      <div className="text-sm font-semibold mb-2">{g.area}</div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {g.items.map((it) => (
                          <article
                            key={it.title}
                            className="border border-border rounded-xl p-4 bg-black/30 flex flex-col gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl leading-none" aria-hidden>
                                {it.emoji}
                              </span>
                              <h5 className="font-semibold text-sm">{it.title}</h5>
                            </div>
                            <span
                              className={`self-start text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${COVERAGE_CHIP[it.coverage].cls}`}
                            >
                              {COVERAGE_CHIP[it.coverage].label}
                            </span>
                            <div className="text-xs text-white/85">{it.what}</div>
                            <div className="text-xs">
                              <span className="text-on-surface-variant">Examples: </span>
                              <span className="text-white/75">{it.examples}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-on-surface-variant">Tools: </span>
                              <span className="text-accent">{it.tools}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
          <p className="text-xs text-on-surface-variant">
            Roadmap: <strong>L1</strong> manual / browser / responsive →{" "}
            <strong>L2</strong> APIs / automation / perf →{" "}
            <strong>L3</strong> security / CI-CD / monitoring →{" "}
            <strong>L4</strong> distributed systems, chaos, scalability,
            reliability engineering.
          </p>
        </div>
      )}
    </section>
  );
}
