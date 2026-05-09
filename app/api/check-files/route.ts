import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { issue } from "@/lib/prompts";
import type { FileCheckResult, Issue } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUILTIN_NODE = new Set([
  "fs", "path", "os", "http", "https", "url", "util", "crypto", "stream", "zlib",
  "events", "buffer", "querystring", "child_process", "net", "tls", "dns",
  "assert", "console", "process", "timers", "readline", "module", "cluster",
  "worker_threads", "perf_hooks", "async_hooks", "vm", "string_decoder",
]);

function isRelative(p: string) {
  return p.startsWith("./") || p.startsWith("../") || p.startsWith("/");
}
function pkgRoot(spec: string) {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.slice(0, 2).join("/");
  }
  return spec.split("/")[0];
}
function normalizeJoin(base: string, rel: string) {
  const baseParts = base.split("/").slice(0, -1);
  const relParts = rel.split("/");
  for (const p of relParts) {
    if (p === "" || p === ".") continue;
    if (p === "..") baseParts.pop();
    else baseParts.push(p);
  }
  return baseParts.join("/");
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Upload a zip file under 'file' field" }, { status: 400 });
    }
    const archiveName = (file as File).name || "project.zip";
    const buf = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);

    const paths: string[] = [];
    const fileContents: Record<string, string> = {};
    const textExt = /\.(json|js|mjs|cjs|ts|tsx|jsx|env|yml|yaml|toml|md|html|css|scss|vue|svelte|astro)$/i;
    const MAX_READ = 300; // cap parsing work
    let readCount = 0;

    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;
      paths.push(entry.name);
    }
    // strip common prefix (when zip has top-level folder)
    let prefix = "";
    if (paths.length) {
      const first = paths[0].split("/")[0] + "/";
      if (paths.every((p) => p.startsWith(first))) prefix = first;
    }
    const norm = (p: string) => (prefix && p.startsWith(prefix) ? p.slice(prefix.length) : p);
    const normalizedPaths = paths.map(norm).filter((p) => !!p && !p.startsWith("__MACOSX"));

    for (const entry of entries) {
      if (entry.dir) continue;
      const n = norm(entry.name);
      if (!n || n.startsWith("__MACOSX")) continue;
      if (textExt.test(n) && readCount < MAX_READ) {
        try {
          fileContents[n] = await entry.async("string");
          readCount++;
        } catch {}
      }
    }

    const hasFile = (name: string) => normalizedPaths.includes(name);
    const hasAny = (names: string[]) => names.some(hasFile);
    const findFile = (base: string) => normalizedPaths.find((p) => p === base || p.endsWith("/" + base));

    // Detect stack
    const stack: string[] = [];
    const pkgPath = findFile("package.json");
    let pkgJson: any = null;
    if (pkgPath && fileContents[pkgPath]) {
      try {
        pkgJson = JSON.parse(fileContents[pkgPath]);
      } catch {}
    }
    const deps: Record<string, string> = {
      ...(pkgJson?.dependencies || {}),
      ...(pkgJson?.devDependencies || {}),
      ...(pkgJson?.peerDependencies || {}),
    };
    if (pkgJson) stack.push("Node.js");
    if (deps["next"]) stack.push("Next.js");
    if (deps["react"] && !deps["next"]) stack.push("React");
    if (deps["vue"]) stack.push("Vue");
    if (deps["svelte"]) stack.push("Svelte");
    if (deps["astro"]) stack.push("Astro");
    if (deps["express"]) stack.push("Express");
    if (hasFile("requirements.txt") || normalizedPaths.some((p) => p.endsWith(".py")))
      stack.push("Python");
    if (hasFile("Gemfile")) stack.push("Ruby");
    if (hasFile("go.mod")) stack.push("Go");
    if (hasFile("Cargo.toml")) stack.push("Rust");
    if (hasFile("index.html") && !pkgJson) stack.push("Static HTML");

    const issues: Issue[] = [];
    const foundFiles: string[] = [];
    const missingFiles: string[] = [];

    // Required files per stack
    const requireFile = (name: string, desc: string, severity: "critical" | "warning" | "info" = "critical", id?: string) => {
      if (hasFile(name)) {
        foundFiles.push(name);
      } else {
        missingFiles.push(name);
        issues.push(
          issue(
            id || `missing-${name}`,
            severity,
            "Files",
            `Missing ${name}`,
            desc,
          ),
        );
      }
    };

    if (pkgJson) {
      // Node/JS project
      if (!pkgJson.scripts || Object.keys(pkgJson.scripts).length === 0)
        issues.push(
          issue(
            "no-scripts",
            "warning",
            "Build",
            "package.json has no scripts",
            "Add at least a \"build\" and \"start\" script so hosts like Vercel/Netlify/Railway can build your project.",
          ),
        );
      if (!pkgJson.scripts?.build)
        issues.push(
          issue(
            "no-build-script",
            "warning",
            "Build",
            "Missing \"build\" script",
            "Most hosts expect `npm run build`. Add an appropriate build command for your framework.",
          ),
        );
      if (!hasAny(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]))
        issues.push(
          issue(
            "no-lockfile",
            "warning",
            "Deps",
            "Missing lockfile",
            "Commit a lockfile (package-lock.json / yarn.lock / pnpm-lock.yaml) for reproducible installs.",
          ),
        );
      if (!hasAny([".gitignore"]))
        issues.push(
          issue(
            "no-gitignore",
            "info",
            "Repo",
            "Missing .gitignore",
            "Add .gitignore to exclude node_modules, .next, dist, .env, etc.",
          ),
        );
      if (!hasAny([".env.example", ".env.sample", ".env.template"]))
        issues.push(
          issue(
            "no-env-example",
            "info",
            "Env",
            "Missing .env.example",
            "Provide an .env.example listing required environment variables so collaborators and hosts know what to set.",
          ),
        );
      if (hasFile(".env"))
        issues.push(
          issue(
            "committed-env",
            "critical",
            "Security",
            ".env committed in archive",
            "A .env file is present inside the zip. Never commit real secrets – add .env to .gitignore and rotate any exposed keys.",
          ),
        );

      if (deps["next"]) {
        // Next.js specifics
        if (!hasAny(["next.config.js", "next.config.mjs", "next.config.ts"]))
          issues.push(
            issue(
              "no-next-config",
              "info",
              "Build",
              "Missing next.config.js",
              "Optional, but recommended for image domains, redirects, and experimental flags.",
            ),
          );
      }
    } else if (stack.includes("Python")) {
      requireFile("requirements.txt", "Python projects need a requirements.txt (or pyproject.toml) to declare dependencies.", "critical");
      if (!hasAny(["Procfile", "render.yaml", "vercel.json", "runtime.txt", "Dockerfile"]))
        issues.push(
          issue(
            "no-py-startup",
            "warning",
            "Build",
            "No startup config for Python app",
            "Add a Procfile (Heroku/Railway), Dockerfile, or host-specific config so your Python app can start in production.",
          ),
        );
    } else if (stack.includes("Static HTML")) {
      if (!hasFile("index.html"))
        issues.push(
          issue(
            "no-index-html",
            "critical",
            "Files",
            "Missing index.html",
            "Static sites must have an index.html at the root.",
          ),
        );
    } else if (normalizedPaths.length > 0) {
      issues.push(
        issue(
          "no-manifest",
          "warning",
          "Files",
          "No recognizable project manifest",
          "Could not find package.json, requirements.txt, go.mod, Gemfile, Cargo.toml, or index.html. Add a manifest so hosts know how to build and run the project.",
        ),
      );
    }

    // README
    if (!hasAny(["README.md", "readme.md", "README.MD", "Readme.md"]))
      issues.push(
        issue(
          "no-readme",
          "info",
          "Repo",
          "Missing README.md",
          "Add a README explaining install, dev, and deploy steps.",
        ),
      );

    // Scan JS/TS imports
    const brokenImports: { file: string; importPath: string }[] = [];
    const missingDepsSet = new Set<string>();
    const codeFileRe = /\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte|astro)$/i;
    const importRe = /\b(?:import\s+(?:[^'"`;]+?\s+from\s+)?|require\s*\(\s*|import\s*\(\s*)["']([^"']+)["']/g;

    const sourceIndex = new Set(normalizedPaths);
    const tryResolve = (fromFile: string, spec: string): boolean => {
      const base = normalizeJoin(fromFile, spec);
      const candidates = [
        base,
        base + ".ts",
        base + ".tsx",
        base + ".js",
        base + ".jsx",
        base + ".mjs",
        base + ".cjs",
        base + ".vue",
        base + ".svelte",
        base + "/index.ts",
        base + "/index.tsx",
        base + "/index.js",
        base + "/index.jsx",
      ];
      return candidates.some((c) => sourceIndex.has(c));
    };

    for (const [fname, content] of Object.entries(fileContents)) {
      if (!codeFileRe.test(fname)) continue;
      importRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = importRe.exec(content))) {
        const spec = m[1];
        if (!spec) continue;
        if (spec.startsWith("data:") || spec.startsWith("http")) continue;
        if (isRelative(spec)) {
          if (!tryResolve(fname, spec)) {
            brokenImports.push({ file: fname, importPath: spec });
          }
        } else {
          const root = pkgRoot(spec);
          if (BUILTIN_NODE.has(root)) continue;
          if (root.startsWith("node:")) continue;
          if (pkgJson && !deps[root]) {
            missingDepsSet.add(root);
          }
        }
      }
    }

    // cap reported issues
    const brokenSample = brokenImports.slice(0, 30);
    if (brokenImports.length > 0) {
      issues.push(
        issue(
          "broken-imports",
          "critical",
          "Imports",
          `${brokenImports.length} broken local import${brokenImports.length > 1 ? "s" : ""}`,
          `Some relative imports don't resolve to any file in the archive.\n` +
            brokenSample.map((b) => `- ${b.file} → ${b.importPath}`).join("\n"),
          brokenSample.map((b) => `${b.file} → ${b.importPath}`).join("\n"),
        ),
      );
    }
    const missingDeps = Array.from(missingDepsSet).sort();
    if (missingDeps.length > 0) {
      issues.push(
        issue(
          "missing-deps",
          "critical",
          "Deps",
          `${missingDeps.length} imported package${missingDeps.length > 1 ? "s" : ""} not in package.json`,
          `These packages are imported but not declared in dependencies:\n` +
            missingDeps.map((d) => `- ${d}`).join("\n") +
            `\n\nRun: npm install ${missingDeps.join(" ")}`,
          missingDeps.join(", "),
        ),
      );
    }

    // ---------------- Testing frameworks ----------------
    const frameworks: string[] = [];
    if (deps["jest"] || hasFile("jest.config.js") || hasFile("jest.config.ts")) frameworks.push("Jest");
    if (deps["vitest"] || hasFile("vitest.config.ts") || hasFile("vitest.config.js")) frameworks.push("Vitest");
    if (deps["mocha"]) frameworks.push("Mocha");
    if (deps["@playwright/test"] || hasFile("playwright.config.ts") || hasFile("playwright.config.js")) frameworks.push("Playwright");
    if (deps["cypress"] || hasFile("cypress.config.ts") || hasFile("cypress.config.js")) frameworks.push("Cypress");
    if (deps["@testing-library/react"]) frameworks.push("React Testing Library");
    if (hasFile("pytest.ini") || hasFile("pyproject.toml") && /\[tool\.pytest/i.test(fileContents["pyproject.toml"] || "")) frameworks.push("Pytest");
    const testFileRe = /(\.|\/)(?:test|spec)\.(?:[tj]sx?|py)$|(?:^|\/)__tests__\//i;
    const testFileCount = normalizedPaths.filter((p) => testFileRe.test(p)).length;
    const hasTestScript = !!(pkgJson?.scripts?.test && !/no test specified/i.test(pkgJson.scripts.test));

    if (frameworks.length === 0 && testFileCount === 0)
      issues.push(
        issue(
          "no-tests",
          "warning",
          "Testing",
          "No testing framework or tests detected",
          "Add unit tests (Jest/Vitest/Pytest) and end-to-end tests (Playwright/Cypress) before going to production.",
        ),
      );
    else if (!hasTestScript && pkgJson)
      issues.push(
        issue(
          "no-test-script",
          "info",
          "Testing",
          "No \"test\" script in package.json",
          "Add `\"test\": \"vitest\"` (or jest/playwright) so CI and contributors can run the suite easily.",
        ),
      );

    // ---------------- CI/CD ----------------
    const ciProviders: string[] = [];
    if (normalizedPaths.some((p) => p.startsWith(".github/workflows/") && p.endsWith(".yml"))) ciProviders.push("GitHub Actions");
    if (hasFile(".gitlab-ci.yml")) ciProviders.push("GitLab CI");
    if (hasFile("circle.yml") || normalizedPaths.includes(".circleci/config.yml")) ciProviders.push("CircleCI");
    if (hasFile("azure-pipelines.yml")) ciProviders.push("Azure Pipelines");
    if (hasFile("Jenkinsfile")) ciProviders.push("Jenkins");
    if (hasFile("vercel.json")) ciProviders.push("Vercel");
    if (hasFile("netlify.toml")) ciProviders.push("Netlify");
    if (hasFile("render.yaml")) ciProviders.push("Render");
    if (hasFile("railway.json") || hasFile("railway.toml")) ciProviders.push("Railway");
    if (hasFile("fly.toml")) ciProviders.push("Fly.io");

    const hasDockerfile = hasFile("Dockerfile") || hasFile("dockerfile");
    const hasDockerCompose = hasAny(["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]);

    if (ciProviders.length === 0)
      issues.push(
        issue(
          "no-cicd",
          "info",
          "DevOps",
          "No CI/CD configuration found",
          "Add a GitHub Actions workflow (or Vercel/Netlify config) to build, test, and deploy automatically on push.",
        ),
      );

    if (hasDockerfile) {
      const df = fileContents["Dockerfile"] || fileContents["dockerfile"] || "";
      if (df) {
        if (/^FROM\s+\S+:latest/im.test(df))
          issues.push(
            issue(
              "docker-latest-tag",
              "warning",
              "DevOps",
              "Dockerfile uses :latest base image",
              "Pin the base image to a specific version for reproducible builds.",
            ),
          );
        if (!/USER\s+\S+/i.test(df))
          issues.push(
            issue(
              "docker-root-user",
              "info",
              "Security",
              "Dockerfile does not declare a non-root USER",
              "Add `USER node` (or similar) before CMD to avoid running the container as root.",
            ),
          );
      }
    }

    // ---------------- Secret scanning ----------------
    const secretPatterns: { kind: string; re: RegExp }[] = [
      { kind: "AWS Access Key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
      { kind: "AWS Secret Access Key", re: /\baws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}\b/i },
      { kind: "Google API key", re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
      { kind: "GitHub token", re: /\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
      { kind: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
      { kind: "Stripe secret key", re: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
      { kind: "OpenAI key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
      { kind: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
      { kind: "Generic secret assignment", re: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i },
    ];
    const secrets: { file: string; kind: string }[] = [];
    for (const [fname, content] of Object.entries(fileContents)) {
      if (fname.includes("node_modules/") || fname.endsWith(".lock") || fname.endsWith("package-lock.json")) continue;
      for (const p of secretPatterns) {
        if (p.re.test(content)) {
          secrets.push({ file: fname, kind: p.kind });
          break; // one finding per file is enough to flag
        }
      }
    }
    if (secrets.length > 0) {
      const sample = secrets.slice(0, 20);
      issues.push(
        issue(
          "secrets-in-source",
          "critical",
          "Security",
          `${secrets.length} possible secret${secrets.length > 1 ? "s" : ""} found in source`,
          `Hard-coded secrets detected. Move these to environment variables and rotate the credentials immediately.\n` +
            sample.map((s) => `- ${s.file} (${s.kind})`).join("\n"),
          sample.map((s) => `${s.file}: ${s.kind}`).join("\n"),
        ),
      );
    }

    // ---------------- Deep-testing signal detection ----------------
    const has = (name: string) => !!deps[name];
    const anyOf = (names: string[]) => names.filter((n) => has(n));

    const stateLibs = anyOf([
      "redux", "@reduxjs/toolkit", "zustand", "jotai", "recoil", "mobx",
      "@tanstack/react-query", "swr", "valtio",
    ]);
    const validationLibs = anyOf(["zod", "yup", "joi", "valibot", "ajv", "class-validator", "superstruct"]);
    const observabilityLibs = anyOf([
      "@sentry/node", "@sentry/nextjs", "@sentry/react", "winston", "pino",
      "@opentelemetry/api", "@opentelemetry/sdk-node", "dd-trace", "newrelic",
    ]);
    const rumLibs = anyOf([
      "@sentry/browser", "@sentry/react", "@sentry/nextjs",
      "@datadog/browser-rum", "@datadog/browser-logs",
      "posthog-js", "logrocket", "@hotjar/browser",
      "web-vitals",
    ]);
    const featureFlagLibs = anyOf([
      "launchdarkly-js-client-sdk", "launchdarkly-node-server-sdk",
      "@unleash/proxy-client-react", "unleash-client",
      "statsig-js", "statsig-node", "@growthbook/growthbook-react",
    ]);
    const propTestLibs = anyOf(["fast-check", "@fast-check/jest"]);

    const apiContractFiles = normalizedPaths.filter((p) =>
      /(^|\/)(openapi|swagger)\.(ya?ml|json)$/i.test(p) ||
      /\.graphql$/i.test(p) ||
      /(^|\/)schema\.prisma$/i.test(p) ||
      /(^|\/)pact\.json$/i.test(p),
    );

    const infraFiles = normalizedPaths.filter((p) =>
      /\.tf$/i.test(p) ||
      /(^|\/)k8s\//i.test(p) ||
      /(^|\/)kubernetes\//i.test(p) ||
      /(^|\/)helm\//i.test(p) ||
      /(^|\/)Chart\.ya?ml$/i.test(p),
    );

    const isWebApp = !!(deps["react"] || deps["next"] || deps["vue"] || deps["svelte"]);
    const isBackendNode = !!(deps["express"] || deps["fastify"] || deps["koa"] || deps["@nestjs/core"] || deps["hono"]);

    if (isWebApp && stateLibs.length === 0)
      issues.push(issue("no-state-mgmt", "info", "State Management",
        "No state-management library detected",
        "For non-trivial apps consider Zustand, Redux Toolkit, Jotai, or TanStack Query for cache state."));

    if ((isWebApp || isBackendNode) && validationLibs.length === 0)
      issues.push(issue("no-validation-lib", "info", "Edge Cases",
        "No input-validation library detected",
        "Add Zod, Valibot, Yup, or Joi to validate untrusted inputs (forms, API bodies, env vars)."));

    if (pkgJson && observabilityLibs.length === 0)
      issues.push(issue("no-observability", "warning", "Observability",
        "No logging / tracing library detected",
        "Add structured logging (pino/winston) and error tracking (Sentry) before production. Optional: OpenTelemetry for traces."));

    if (isWebApp && rumLibs.length === 0)
      issues.push(issue("no-rum", "info", "RUM",
        "No Real User Monitoring detected",
        "Add Sentry, Datadog RUM, PostHog, LogRocket, or the `web-vitals` package to capture real-user issues and Core Web Vitals."));

    if (apiContractFiles.length === 0 && (isBackendNode || normalizedPaths.some((p) => /\/api\//.test(p))))
      issues.push(issue("no-api-contract", "info", "API Contract",
        "No API schema (OpenAPI / GraphQL / Prisma / Pact) found",
        "Document your API with OpenAPI/Swagger or a GraphQL schema so frontend and backend can be contract-tested."));

    if (propTestLibs.length === 0 && (isWebApp || isBackendNode) && frameworks.length > 0)
      issues.push(issue("no-property-tests", "info", "Edge Cases",
        "No property-based testing library detected",
        "Consider fast-check to fuzz-test edge cases (huge inputs, unicode, boundary values)."));

    if (featureFlagLibs.length === 0 && pkgJson)
      issues.push(issue("no-feature-flags", "info", "Production",
        "No feature-flag library detected",
        "Feature flags (LaunchDarkly, Unleash, Statsig, GrowthBook, PostHog) enable canary releases and safe rollbacks without redeploys."));

    if (infraFiles.length > 0)
      issues.push(issue("iac-detected", "info", "DevOps",
        `Infrastructure-as-Code files detected (${infraFiles.length})`,
        "Run `terraform validate` / `kubeval` / `helm lint` in CI and add policy scans (tfsec, Checkov, kube-score)."));

    const manualChecks = [
      "End-to-end user journey via Playwright or Cypress",
      "Cross-browser smoke test (Chrome, Safari, Firefox, Edge)",
      "Database migration / rollback rehearsal",
      "Load test critical APIs (k6, JMeter)",
      "Security scan with OWASP ZAP / Burp Suite",
      "Lighthouse audit on production build",
      "Verify environment variables in production host",
      "Rollback / disaster-recovery drill",
    ];

    const result: FileCheckResult = {
      kind: "file",
      archiveName,
      fileCount: normalizedPaths.length,
      detectedStack: stack,
      foundFiles,
      missingFiles,
      brokenImports: brokenSample,
      missingDeps,
      testing: { frameworks, hasTestScript, testFileCount },
      cicd: { providers: ciProviders, hasDockerfile, hasDockerCompose },
      secrets: secrets.slice(0, 50),
      issues,
      scannedAt: new Date().toISOString(),
      manualChecks,
    };
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to analyze archive" }, { status: 500 });
  }
}
