import { NextRequest, NextResponse } from "next/server";
import tls from "node:tls";
import net from "node:net";
import dns from "node:dns/promises";
import type { MxRecord, SoaRecord } from "node:dns";
import { issue } from "@/lib/prompts";
import type { Issue, SiteIntel, UrlCheckResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Use reliable public resolvers — avoids macOS/ISP resolver hangs
try { dns.setServers(["1.1.1.1", "8.8.8.8", "9.9.9.9"]); } catch {}

const UA =
  "Mozilla/5.0 (compatible; DeployReadyBot/1.0; +https://deployready.in)";

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function checkSSL(hostname: string, port = 443, timeoutMs = 8000): Promise<UrlCheckResult["ssl"]> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        const authorized = (socket as any).authorized as boolean;
        const validTo = cert?.valid_to ? new Date(cert.valid_to) : undefined;
        const daysRemaining = validTo
          ? Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined;
        resolve({
          valid: !!authorized && (daysRemaining === undefined || daysRemaining > 0),
          protocol: socket.getProtocol() || undefined,
          issuer: cert?.issuer?.O,
          validTo: cert?.valid_to,
          daysRemaining,
        });
        socket.end();
      },
    );
    socket.on("error", () => resolve({ valid: false }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ valid: false });
    });
  });
}

function checkTlsDetail(hostname: string, port = 443, timeoutMs = 4000): Promise<NonNullable<SiteIntel["tlsDetail"]>> {
  return new Promise((resolve) => {
    const out: NonNullable<SiteIntel["tlsDetail"]> = {};
    const opts: any = {
      host: hostname,
      port,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: timeoutMs,
      ALPNProtocols: ["h2", "http/1.1"],
      requestOCSP: true,
    };
    const socket = tls.connect(opts,
      () => {
        try {
          out.protocol = socket.getProtocol() || undefined;
          const c: any = socket.getCipher?.();
          if (c) {
            out.cipher = c.name;
            const kx = (c as any).standardName || c.name;
            out.keyExchange = kx;
          }
          out.alpn = (socket as any).alpnProtocol || undefined;
          // Forward secrecy heuristic: ECDHE/DHE in cipher name
          if (out.cipher) out.forwardSecrecy = /ECDHE|DHE/i.test(out.cipher) || /TLS_AES|TLS_CHACHA/i.test(out.cipher);
        } catch {}
        socket.end();
      },
    );
    socket.on("OCSPResponse", (resp) => {
      out.ocspStapling = !!resp && resp.length > 0;
    });
    socket.on("session", () => {
      out.sessionResumption = true;
    });
    const finish = () => resolve(out);
    socket.on("close", finish);
    socket.on("error", finish);
    socket.on("timeout", () => {
      socket.destroy();
      finish();
    });
  });
}

function probePort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const finish = (open: boolean) => {
      if (done) return;
      done = true;
      try { s.destroy(); } catch {}
      resolve(open);
    };
    s.setTimeout(timeoutMs);
    s.once("connect", () => finish(true));
    s.once("error", () => finish(false));
    s.once("timeout", () => finish(false));
    s.connect(port, host);
  });
}

const PORTS_TO_PROBE = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 8443];

function pickMeta(html: string) {
  const lower = html.toLowerCase();
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1].trim() : undefined;
  };
  const title = get(/<title[^>]*>([^<]*)<\/title>/i);
  const description = get(
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
  );
  const ogTitle = get(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogDescription = get(
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
  );
  const ogImage = get(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const twitterCard = get(
    /<meta[^>]+name=["']twitter:card["'][^>]*content=["']([^"']*)["']/i,
  );
  const canonical = get(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const lang = get(/<html[^>]*\slang=["']([^"']+)["']/i);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const favicon = /<link[^>]+rel=["'](?:icon|shortcut icon)["']/i.test(lower);
  const responsiveHints =
    /@media\s*\(/i.test(html) || /max-width|min-width/i.test(html) || /tailwind|bootstrap/i.test(lower);
  const structuredData = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) || []).length;
  return { title, description, ogTitle, ogDescription, ogImage, twitterCard, canonical, lang, viewport, favicon, responsiveHints, structuredData };
}

function analyzeAccessibility(html: string) {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsTotal = imgs.length;
  let imgsMissingAlt = 0;
  for (const tag of imgs) {
    if (!/\salt\s*=\s*["'][^"']*["']/i.test(tag)) imgsMissingAlt++;
  }
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const forms = html.match(/<form\b[^>]*>/gi) || [];
  const formsTotal = forms.length;
  // very rough: count inputs lacking aria-label/placeholder/id linked label
  const inputs = html.match(/<input\b[^>]*>/gi) || [];
  let inputsMissingLabel = 0;
  for (const tag of inputs) {
    const type = (tag.match(/\stype\s*=\s*["']([^"']+)["']/i)?.[1] || "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
    const hasAria = /\saria-label\s*=/i.test(tag) || /\saria-labelledby\s*=/i.test(tag);
    const hasPlaceholder = /\splaceholder\s*=/i.test(tag);
    const idMatch = tag.match(/\sid\s*=\s*["']([^"']+)["']/i)?.[1];
    const hasLabelFor = idMatch ? new RegExp(`<label[^>]*\\sfor=["']${idMatch}["']`, "i").test(html) : false;
    if (!hasAria && !hasPlaceholder && !hasLabelFor) inputsMissingLabel++;
  }
  return { imgsTotal, imgsMissingAlt, h1Count, formsTotal, inputsMissingLabel };
}

async function fetchSafe(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctl.signal,
      headers: { "user-agent": UA, ...(init.headers || {}) },
      ...init,
    });
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body?.url === "string" ? body.url : "";
    if (!raw) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const url = normalizeUrl(raw);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const issues: Issue[] = [];
    const start = Date.now();
    let res: Response | null = null;
    let html = "";
    let finalUrl = url;
    let statusCode: number | undefined;
    let online = false;
    let pageSizeBytes: number | undefined;
    let contentEncoding: string | undefined;
    let cacheControl: string | undefined;
    let poweredBy: string | undefined;
    const securityHeaders: Record<string, string | undefined> = {};

    res = await fetchSafe(url, { headers: { accept: "text/html,*/*" } }, 15000);
    if (res) {
      statusCode = res.status;
      finalUrl = res.url || url;
      online = res.ok;
      const ct = res.headers.get("content-type") || "";
      contentEncoding = res.headers.get("content-encoding") || undefined;
      cacheControl = res.headers.get("cache-control") || undefined;
      poweredBy = res.headers.get("x-powered-by") || undefined;
      const sec = [
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy",
      ];
      for (const h of sec) securityHeaders[h] = res.headers.get(h) || undefined;
      if (ct.includes("text/html") || ct === "") {
        const txt = await res.text();
        html = txt;
        pageSizeBytes = Buffer.byteLength(txt, "utf8");
      }
    }
    const loadTimeMs = Date.now() - start;

    const finalParsed = (() => {
      try {
        return new URL(finalUrl);
      } catch {
        return parsed;
      }
    })();

    // SSL
    const ssl =
      finalParsed.protocol === "https:"
        ? await checkSSL(finalParsed.hostname, Number(finalParsed.port) || 443)
        : { valid: false };

    // HTTP -> HTTPS redirect probe (only if origin HTTPS worked)
    let httpsRedirect: boolean | undefined;
    if (finalParsed.protocol === "https:") {
      const httpUrl = `http://${finalParsed.hostname}${finalParsed.pathname || "/"}`;
      const r2 = await fetchSafe(httpUrl, { redirect: "manual" }, 6000);
      if (r2) {
        const loc = r2.headers.get("location") || "";
        httpsRedirect = (r2.status >= 300 && r2.status < 400 && /^https:/i.test(loc)) || r2.url.startsWith("https://");
      }
    }

    // SEO files + deployment hygiene probes (parallel HEAD/GET)
    const origin = `${finalParsed.protocol}//${finalParsed.host}`;
    const [robotsR, sitemapR, envR, gitR] = await Promise.all([
      fetchSafe(origin + "/robots.txt", {}, 5000),
      fetchSafe(origin + "/sitemap.xml", {}, 5000),
      fetchSafe(origin + "/.env", {}, 4000),
      fetchSafe(origin + "/.git/HEAD", {}, 4000),
    ]);
    const robotsOk = !!(robotsR && robotsR.ok);
    const sitemap = !!(sitemapR && sitemapR.ok);
    const exposedEnv = !!(envR && envR.ok && (envR.headers.get("content-type") || "").includes("text"));
    let gitText = "";
    if (gitR && gitR.ok) {
      try { gitText = (await gitR.text()).slice(0, 200); } catch {}
    }
    const exposedGit = /^ref:\s/m.test(gitText);

    // Source map exposure heuristic – look for //# sourceMappingURL in inline
    const sourceMapExposed = /\/\/[#@]\s*sourceMappingURL=/.test(html);

    // HTML analysis
    const meta = pickMeta(html);
    const a11y = analyzeAccessibility(html);
    const inlineScripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) || []).length;
    const externalScripts = (html.match(/<script[^>]*\bsrc=/gi) || []).length;
    const images = a11y.imgsTotal;

    // Issues -----------------------------------------------------------------

    // Availability
    if (!online) {
      issues.push(
        issue(
          "site-offline",
          "critical",
          "Functional",
          "Site is offline or unreachable",
          `Fetching ${url} failed or returned status ${statusCode ?? "n/a"}. Verify deployment, DNS, and that the server is running.`,
          `URL: ${url}\nStatus: ${statusCode ?? "no response"}`,
        ),
      );
    } else if (statusCode && statusCode >= 400) {
      issues.push(
        issue(
          "bad-status",
          "critical",
          "Functional",
          `HTTP ${statusCode} returned`,
          "The page returned a 4xx/5xx status. Visitors will see an error.",
        ),
      );
    }

    // SSL / Security transport
    if (finalParsed.protocol !== "https:") {
      issues.push(
        issue(
          "no-https",
          "critical",
          "Security",
          "Site is not served over HTTPS",
          "Browsers mark HTTP sites as not secure. Enforce HTTPS with a valid TLS certificate.",
        ),
      );
    } else if (!ssl.valid) {
      issues.push(
        issue(
          "ssl-invalid",
          "critical",
          "Security",
          "SSL certificate is invalid or expired",
          `TLS handshake failed or the certificate is not trusted. Days remaining: ${ssl.daysRemaining ?? "unknown"}.`,
          `Host: ${finalParsed.hostname}\nIssuer: ${ssl.issuer ?? "unknown"}\nValidTo: ${ssl.validTo ?? "unknown"}`,
        ),
      );
    } else if ((ssl.daysRemaining ?? 999) < 15) {
      issues.push(
        issue(
          "ssl-expiring",
          "warning",
          "Security",
          "SSL certificate expires soon",
          `Certificate expires in ${ssl.daysRemaining} days. Renew before expiry.`,
        ),
      );
    }
    if (httpsRedirect === false) {
      issues.push(
        issue(
          "no-https-redirect",
          "warning",
          "Security",
          "HTTP does not redirect to HTTPS",
          "Requests to http:// don't redirect to https://. Configure a 301 redirect at the server/host level.",
        ),
      );
    }

    // Security headers
    const sh = securityHeaders;
    const headerIssues: { id: string; key: string; title: string; desc: string; sev: "critical" | "warning" | "info" }[] = [
      { id: "no-hsts", key: "strict-transport-security", title: "Missing HSTS header", desc: "Add Strict-Transport-Security to force HTTPS for repeat visitors.", sev: "warning" },
      { id: "no-csp", key: "content-security-policy", title: "Missing Content-Security-Policy", desc: "A CSP mitigates XSS by restricting allowed script/style/source origins.", sev: "warning" },
      { id: "no-xfo", key: "x-frame-options", title: "Missing X-Frame-Options", desc: "Set X-Frame-Options: DENY/SAMEORIGIN (or use CSP frame-ancestors) to prevent clickjacking.", sev: "warning" },
      { id: "no-xcto", key: "x-content-type-options", title: "Missing X-Content-Type-Options", desc: "Set X-Content-Type-Options: nosniff to prevent MIME sniffing.", sev: "info" },
      { id: "no-referrer", key: "referrer-policy", title: "Missing Referrer-Policy", desc: "Set Referrer-Policy (e.g. strict-origin-when-cross-origin) to limit referrer leaks.", sev: "info" },
      { id: "no-perm-policy", key: "permissions-policy", title: "Missing Permissions-Policy", desc: "Restrict powerful browser features (camera, geolocation, etc.) via Permissions-Policy.", sev: "info" },
    ];
    if (online) {
      for (const h of headerIssues) {
        if (!sh[h.key]) issues.push(issue(h.id, h.sev, "Security", h.title, h.desc));
      }
    }
    if (poweredBy) {
      issues.push(
        issue(
          "powered-by-leak",
          "info",
          "Security",
          "X-Powered-By header reveals stack",
          `Server reports "${poweredBy}". Hide this in your reverse proxy / framework config.`,
        ),
      );
    }
    if (exposedEnv) {
      issues.push(
        issue(
          "exposed-env",
          "critical",
          "Security",
          "/.env is publicly accessible",
          "An .env file appears to be served from the web root. Block dotfiles at the server level and rotate any exposed secrets immediately.",
        ),
      );
    }
    if (exposedGit) {
      issues.push(
        issue(
          "exposed-git",
          "critical",
          "Security",
          "/.git directory is publicly exposed",
          "Source-control internals are reachable; an attacker can clone your full source. Block /.git/* in your web server.",
        ),
      );
    }
    if (sourceMapExposed) {
      issues.push(
        issue(
          "source-map-exposed",
          "info",
          "Security",
          "Source map URL referenced in HTML",
          "Public source maps make it easy to read your original source. Strip or restrict in production builds.",
        ),
      );
    }

    // Performance
    if (online) {
      if (loadTimeMs > 3000)
        issues.push(issue("slow-load", "warning", "Performance", "Slow page response", `Initial response took ${loadTimeMs}ms. Aim for under 1500ms. Consider CDN, caching, smaller bundles.`));
      else if (loadTimeMs > 1500)
        issues.push(issue("moderate-load", "info", "Performance", "Moderate page response", `Initial response took ${loadTimeMs}ms. Acceptable but could be improved.`));
      if (!contentEncoding)
        issues.push(issue("no-compression", "warning", "Performance", "No response compression", "Response is not gzip/brotli encoded. Enable compression at the server/CDN level."));
      if (!cacheControl)
        issues.push(issue("no-cache-control", "info", "Performance", "Missing Cache-Control header", "Set Cache-Control on static assets to enable browser/CDN caching."));
      if ((pageSizeBytes ?? 0) > 1_500_000)
        issues.push(issue("large-html", "warning", "Performance", "Very large HTML payload", `HTML is ${(pageSizeBytes! / 1024).toFixed(0)} KB. Consider SSR streaming, code-splitting, and removing unused markup.`));
      if (inlineScripts > 5)
        issues.push(issue("many-inline-scripts", "info", "Performance", "Many inline <script> blocks", `${inlineScripts} inline scripts found. Move to external bundles for caching and CSP friendliness.`));
    }

    // SEO – meta + files + structured data
    if (online) {
      if (!meta.title) issues.push(issue("meta-title", "warning", "SEO", "Missing <title> tag", "Page has no <title>. Hurts SEO and browser tabs."));
      if (!meta.description) issues.push(issue("meta-description", "warning", "SEO", "Missing meta description", "Add <meta name=\"description\"> summarizing the page."));
      if (!meta.ogTitle || !meta.ogDescription || !meta.ogImage)
        issues.push(issue("meta-og", "warning", "SEO", "Missing Open Graph tags", "Add og:title, og:description, og:image for rich link previews."));
      if (!meta.twitterCard) issues.push(issue("meta-twitter", "info", "SEO", "Missing Twitter card", "Add <meta name=\"twitter:card\" content=\"summary_large_image\">."));
      if (!meta.canonical) issues.push(issue("meta-canonical", "info", "SEO", "Missing canonical link", "Add <link rel=\"canonical\"> to avoid duplicate-content issues."));
      if (!meta.favicon) issues.push(issue("no-favicon", "info", "Branding", "Missing favicon", "Add <link rel=\"icon\" href=\"/favicon.ico\">."));
      if (!robotsOk) issues.push(issue("no-robots", "warning", "SEO", "robots.txt not found", "Add a robots.txt at the site root to control crawler access."));
      if (!sitemap) issues.push(issue("no-sitemap", "warning", "SEO", "sitemap.xml not found", "Add a sitemap.xml at the site root to help search engines index your pages."));
      if ((meta.structuredData ?? 0) === 0)
        issues.push(issue("no-structured-data", "info", "SEO", "No JSON-LD structured data", "Add JSON-LD (Organization, WebSite, BreadcrumbList, Article) for rich results."));
    }

    // Mobile / Responsive
    if (online) {
      if (!meta.viewport)
        issues.push(issue("no-viewport", "critical", "Responsive", "Not mobile friendly – missing viewport meta", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."));
      else if (!meta.responsiveHints)
        issues.push(issue("no-responsive", "info", "Responsive", "No responsive CSS detected", "No media queries found. Verify the layout adapts on small screens."));
    }

    // RUM / Observability detection (heuristic: known script hostnames/snippets in HTML)
    if (online) {
      const rumProbes: { id: string; re: RegExp; name: string }[] = [
        { id: "sentry", re: /sentry-cdn\.com|@sentry\/browser|browser\.sentry-cdn|Sentry\.init/i, name: "Sentry" },
        { id: "datadog", re: /datadoghq\.com\/(rum|browser-agent)|DD_RUM/i, name: "Datadog RUM" },
        { id: "newrelic", re: /js-agent\.newrelic\.com|NREUM/i, name: "New Relic Browser" },
        { id: "posthog", re: /posthog\.com\/array|posthog\.init/i, name: "PostHog" },
        { id: "logrocket", re: /cdn\.lr-in\.com|LogRocket\.init/i, name: "LogRocket" },
        { id: "hotjar", re: /static\.hotjar\.com|hjid:\s*\d+/i, name: "Hotjar" },
        { id: "ga", re: /googletagmanager\.com\/gtag\/js|gtag\(|google-analytics\.com\/analytics\.js/i, name: "Google Analytics / GTM" },
      ];
      const found = rumProbes.filter((p) => p.re.test(html)).map((p) => p.name);
      const hasWebVitals = /web-vitals|onCLS|onLCP|onINP|onFID/i.test(html);
      if (found.length === 0 && !hasWebVitals)
        issues.push(
          issue(
            "no-rum-script",
            "info",
            "RUM",
            "No Real User Monitoring or analytics script detected",
            "Add Sentry, Datadog RUM, PostHog, LogRocket, or the `web-vitals` package to capture real-user errors and Core Web Vitals from production traffic.",
          ),
        );
    }

    // Accessibility
    if (online) {
      if (!meta.lang) issues.push(issue("no-html-lang", "warning", "Accessibility", "<html> missing lang attribute", "Add lang=\"en\" (or appropriate) to <html> for screen readers and translation tools."));
      if (a11y.imgsTotal > 0 && a11y.imgsMissingAlt > 0)
        issues.push(issue("img-alt-missing", "warning", "Accessibility", `${a11y.imgsMissingAlt} of ${a11y.imgsTotal} <img> tags missing alt`, "Provide descriptive alt text on images, or alt=\"\" for decorative ones."));
      if (a11y.h1Count === 0)
        issues.push(issue("no-h1", "info", "Accessibility", "No <h1> heading on page", "Each page should have exactly one descriptive <h1> for document outline."));
      else if (a11y.h1Count > 1)
        issues.push(issue("many-h1", "info", "Accessibility", `${a11y.h1Count} <h1> headings found`, "Prefer a single <h1> per page; use <h2>+ for subsections."));
      if (a11y.formsTotal > 0 && a11y.inputsMissingLabel > 0)
        issues.push(issue("inputs-no-label", "warning", "Accessibility", `${a11y.inputsMissingLabel} form inputs without label`, "Associate each input with a <label for> or aria-label so screen readers can announce it."));
    }

    // ============== Site Intelligence (web-check style) ==============
    const host = finalParsed.hostname;

    // Redirect chain probe (only first hop, with method HEAD for speed)
    const redirectsP = (async () => {
      const out: { from: string; status?: number; to?: string }[] = [];
      let cur = url;
      for (let i = 0; i < 3; i++) {
        const r = await fetchSafe(cur, { method: "HEAD", redirect: "manual" }, 2500);
        if (!r) break;
        const loc = r.headers.get("location") || undefined;
        const next = loc ? new URL(loc, cur).toString() : undefined;
        out.push({ from: cur, status: r.status, to: next });
        if (!next || r.status < 300 || r.status >= 400) break;
        cur = next;
      }
      return out;
    })();

    // All DNS via DoH (Cloudflare) — reliable HTTP with strict timeouts
    const doh = async (name: string, type: string) => {
      const r = await fetchSafe(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
        { headers: { accept: "application/dns-json" } },
        3500,
      );
      if (!r || !r.ok) return [] as any[];
      try {
        const j: any = await r.json();
        return (j?.Answer || []) as any[];
      } catch {
        return [] as any[];
      }
    };
    // Strip trailing dots / quotes from DoH answers
    const cleanData = (d: string) => d.replace(/^"|"$/g, "").replace(/\\"/g, '"');
    const dnsP = Promise.all([
      doh(host, "A"),
      doh(host, "AAAA"),
      doh(host, "MX"),
      doh(host, "NS"),
      doh(host, "TXT"),
      doh(host, "CAA"),
      doh(host, "SOA"),
      doh(`_dmarc.${host}`, "TXT"),
      doh(`default._bimi.${host}`, "TXT"),
    ]);
    // Root domain for RDAP
    const rootDomain = (() => {
      const parts = host.split(".");
      return parts.length >= 2 ? parts.slice(-2).join(".") : host;
    })();

    // RDAP / security.txt — kick off in parallel with DNS + DoH + redirect chain
    const rdapP = (async (): Promise<SiteIntel["rdap"]> => {
      const rr = await fetchSafe(`https://rdap.org/domain/${rootDomain}`, {}, 3500);
      if (!rr || !rr.ok) return undefined;
      try {
        const j: any = await rr.json();
        const events: any[] = j?.events || [];
        const ev = (a: string) => events.find((e) => e.eventAction === a)?.eventDate;
        const registrar = (j?.entities || []).find((e: any) => (e.roles || []).includes("registrar"));
        return {
          registrar:
            registrar?.vcardArray?.[1]?.find((x: any[]) => x[0] === "fn")?.[3] ?? registrar?.handle,
          created: ev("registration"),
          expires: ev("expiration"),
          updated: ev("last changed"),
          nameservers: (j?.nameservers || []).map((n: any) => (n.ldhName || "").toLowerCase()),
        };
      } catch {
        return undefined;
      }
    })();

    const stxtP = fetchSafe(`${origin}/.well-known/security.txt`, { method: "HEAD" }, 2500);
    const robotsP = (async () => {
      const r = await fetchSafe(`${origin}/robots.txt`, {}, 2500);
      if (!r || !r.ok) return undefined;
      try { return (await r.text()).slice(0, 4096); } catch { return undefined; }
    })();
    const tlsDetailP = checkTlsDetail(host).catch(() => ({} as NonNullable<SiteIntel["tlsDetail"]>));
    const portsP = Promise.all(PORTS_TO_PROBE.map((p) => probePort(host, p, 1500))).then((flags) => {
      const open: number[] = [];
      const closed: number[] = [];
      flags.forEach((ok, i) => (ok ? open : closed).push(PORTS_TO_PROBE[i]));
      return { open, closed };
    });

    // Resolve all parallel intelligence with a hard race timeout per probe
    const withTimeout = <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
      Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
    const emptyDnsRes: any[][] = [[], [], [], [], [], [], [], [], []];
    const [dnsRes, dsArr, dnskeyArr, redirects, rdap, stxt, robots, tlsDetail, ports] = await Promise.all([
      withTimeout(dnsP, 5500, emptyDnsRes as any),
      withTimeout(doh(host, "DS"), 4500, [] as any[]),
      withTimeout(doh(host, "DNSKEY"), 4500, [] as any[]),
      withTimeout(redirectsP, 7000, [] as { from: string; status?: number; to?: string }[]),
      withTimeout(rdapP, 4500, undefined as SiteIntel["rdap"]),
      withTimeout(stxtP, 3500, null as any),
      withTimeout(robotsP, 3500, undefined as string | undefined),
      withTimeout(tlsDetailP, 5500, {} as NonNullable<SiteIntel["tlsDetail"]>),
      withTimeout(portsP, 6000, { open: [], closed: [] }),
    ]);

    // DoH answers are [{name, type, TTL, data}]. Extract clean strings.
    const getData = (arr: any[]) => (arr || []).map((a) => cleanData(String(a?.data ?? "")));
    const stripDot = (s: string) => s.replace(/\.$/, "");
    const aRecs = getData(dnsRes[0]);
    const aaaaRecs = getData(dnsRes[1]);
    const mxRecs: MxRecord[] = getData(dnsRes[2])
      .map((d) => {
        const [pri, ex] = d.split(/\s+/, 2);
        const priority = parseInt(pri, 10);
        return { priority: isNaN(priority) ? 0 : priority, exchange: stripDot(ex || "") };
      })
      .filter((m) => m.exchange);
    const nsRecs = getData(dnsRes[3]).map(stripDot);
    const txtRecs = getData(dnsRes[4]);
    const caaRecs = getData(dnsRes[5]);
    const soa = (() => {
      const first = getData(dnsRes[6])[0];
      if (!first) return undefined;
      // SOA rdata: "primary admin serial refresh retry expire minimum"
      const parts = first.split(/\s+/);
      const primary = stripDot(parts[0] || "");
      const admin = stripDot(parts[1] || "");
      const serial = parseInt(parts[2] || "0", 10);
      return primary ? { primary, admin, serial } : undefined;
    })();
    const dmarcTxts = getData(dnsRes[7]);
    const bimiTxts = getData(dnsRes[8]);

    const spf = txtRecs.find((t) => /^v=spf1/i.test(t));
    const dmarc = dmarcTxts.find((t) => /^v=DMARC1/i.test(t));
    const bimi = bimiTxts.find((t) => /^v=BIMI1/i.test(t));

    // GeoIP via ip-api.com (needs IP from DNS) — fire after DNS resolves
    const ip = aRecs[0];
    let geo: SiteIntel["geo"] | undefined;
    if (ip) {
      const gr = await fetchSafe(
        `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone,org,as,lat,lon`,
        {},
        2500,
      );
      if (gr && gr.ok) {
        try {
          const j: any = await gr.json();
          if (j.status === "success") {
            geo = {
              country: j.country,
              region: j.regionName,
              city: j.city,
              tz: j.timezone,
              org: j.org,
              asn: j.as,
              lat: j.lat,
              lon: j.lon,
            };
          }
        } catch {}
      }
    }

    // Cookies – parse Set-Cookie from primary response
    const cookies: SiteIntel["cookies"] = [];
    if (res) {
      const setHeaders: string[] = [];
      // node fetch combines Set-Cookie via getSetCookie() in modern undici
      const getter = (res.headers as any).getSetCookie?.bind(res.headers);
      if (typeof getter === "function") setHeaders.push(...getter());
      else {
        const sc = res.headers.get("set-cookie");
        if (sc) setHeaders.push(...sc.split(/,(?=\s*[A-Za-z0-9_\-]+=)/));
      }
      for (const sc of setHeaders) {
        const name = sc.split("=")[0].trim();
        if (!name) continue;
        const lower = sc.toLowerCase();
        const sameSite = lower.match(/samesite=(strict|lax|none)/i)?.[1];
        cookies.push({
          name,
          secure: /;\s*secure/i.test(sc),
          httpOnly: /;\s*httponly/i.test(sc),
          sameSite,
        });
      }
    }

    // CDN / WAF detection
    let cdnWaf: string | undefined;
    if (res) {
      const server = (res.headers.get("server") || "").toLowerCase();
      const via = (res.headers.get("via") || "").toLowerCase();
      if (server.includes("cloudflare") || res.headers.get("cf-ray")) cdnWaf = "Cloudflare";
      else if (res.headers.get("x-vercel-id")) cdnWaf = "Vercel";
      else if (res.headers.get("x-nf-request-id") || res.headers.get("x-nf-cache")) cdnWaf = "Netlify";
      else if (server.includes("akamai") || via.includes("akamai")) cdnWaf = "Akamai";
      else if (res.headers.get("x-fastly-request-id") || via.includes("fastly")) cdnWaf = "Fastly";
      else if (res.headers.get("x-amz-cf-id") || server.includes("cloudfront")) cdnWaf = "AWS CloudFront";
      else if (server.includes("nginx") || server.includes("apache")) cdnWaf = `Origin: ${server}`;
    }

    // /.well-known/security.txt — already fetched in parallel above
    const securityTxt = !!(stxt && stxt.ok);

    // Linked pages (internal vs external) from HTML
    let internalLinks = 0;
    let externalLinks = 0;
    if (html) {
      const hrefRe = /<a\b[^>]*\shref=["']([^"'#][^"']*)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = hrefRe.exec(html))) {
        const href = m[1];
        if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
        try {
          const u = new URL(href, finalUrl);
          if (u.host === finalParsed.host) internalLinks++;
          else externalLinks++;
        } catch {}
      }
    }

    // Carbon footprint estimate (websitecarbon-style: ~1.8 kWh/GB; 442g CO2/kWh)
    const carbonGrams = pageSizeBytes
      ? +(((pageSizeBytes / 1024 / 1024 / 1024) * 1.8 * 442)).toFixed(3)
      : undefined;

    const intel: SiteIntel = {
      ip,
      geo,
      redirects,
      dns: {
        a: aRecs,
        aaaa: aaaaRecs,
        mx: mxRecs.map((m) => ({ exchange: m.exchange, priority: m.priority })),
        ns: nsRecs,
        txt: txtRecs,
        caa: caaRecs,
        soa,
        dnssec: { ds: dsArr.length > 0, dnskey: dnskeyArr.length > 0 },
      },
      email: { spf, dmarc, bimi },
      rdap,
      cookies,
      cdnWaf,
      securityTxt,
      linkedPages: { internal: internalLinks, external: externalLinks },
      carbonGrams,
      ports,
      tlsDetail,
      headers: (() => {
        const h: Record<string, string> = {};
        if (res) res.headers.forEach((v, k) => { h[k] = v; });
        return h;
      })(),
      robots,
      hostnames: aRecs.length ? Array.from(new Set([host, rootDomain])) : [host],
    };

    // ---- Intel-derived issues ----
    if (online) {
      // Cookies hygiene
      for (const c of cookies) {
        if (!c.secure)
          issues.push(issue(`cookie-no-secure-${c.name}`, "warning", "Security",
            `Cookie "${c.name}" missing Secure flag`,
            "Add the Secure attribute so the cookie is only sent over HTTPS."));
        if (!c.httpOnly)
          issues.push(issue(`cookie-no-httponly-${c.name}`, "info", "Security",
            `Cookie "${c.name}" missing HttpOnly flag`,
            "Add HttpOnly so JS can't read it (mitigates XSS-driven theft). Skip for cookies your front-end actually needs to read."));
        if (!c.sameSite)
          issues.push(issue(`cookie-no-samesite-${c.name}`, "info", "Security",
            `Cookie "${c.name}" missing SameSite attribute`,
            "Set SameSite=Lax or Strict to mitigate CSRF."));
      }

      // Email auth (only if MX exists)
      if (mxRecs.length > 0) {
        if (!spf) issues.push(issue("no-spf", "warning", "Email",
          "Domain has no SPF record",
          "Add a TXT record `v=spf1 include:<provider> ~all` so receiving mail servers can verify outbound mail."));
        if (!dmarc) issues.push(issue("no-dmarc", "warning", "Email",
          "Domain has no DMARC record",
          "Add a TXT record at `_dmarc.<domain>` with `v=DMARC1; p=quarantine; rua=mailto:...` to prevent spoofing."));
        if (!bimi) issues.push(issue("no-bimi", "info", "Email",
          "No BIMI record",
          "Optional: add a BIMI TXT record + verified logo so brand logos appear in supported inboxes."));
      }

      // DNSSEC
      if (!intel.dns.dnssec.ds && !intel.dns.dnssec.dnskey)
        issues.push(issue("no-dnssec", "info", "DNS",
          "DNSSEC not enabled",
          "Enable DNSSEC at your registrar/DNS provider to cryptographically sign DNS answers."));

      // CAA
      if (intel.dns.caa.length === 0)
        issues.push(issue("no-caa", "info", "DNS",
          "No CAA DNS record",
          "Add CAA records (e.g. `0 issue \"letsencrypt.org\"`) to restrict which CAs may issue certs for your domain."));

      // security.txt
      if (!securityTxt)
        issues.push(issue("no-security-txt", "info", "Security",
          "Missing /.well-known/security.txt",
          "Publish a security.txt so researchers know where to disclose vulnerabilities (RFC 9116)."));

      // Extra security headers (COOP/CORP/COEP)
      if (!res?.headers.get("cross-origin-opener-policy"))
        issues.push(issue("no-coop", "info", "Security",
          "Missing Cross-Origin-Opener-Policy",
          "Set COOP (e.g. same-origin) for stronger isolation between top-level browsing contexts."));
      if (!res?.headers.get("cross-origin-resource-policy"))
        issues.push(issue("no-corp", "info", "Security",
          "Missing Cross-Origin-Resource-Policy",
          "Set CORP (e.g. same-origin / same-site) to control which origins may load your resources."));

      // Port hygiene — flag risky open ports
      const risky = (ports?.open || []).filter((p) => [21, 22, 23, 3306, 3389, 5432, 6379].includes(p));
      if (risky.length)
        issues.push(issue("risky-open-ports", "warning", "Security",
          `Risky ports open: ${risky.join(", ")}`,
          "Restrict access to admin/database ports (SSH, RDP, MySQL, Postgres, Redis) via firewall or VPN. Public exposure is a major attack surface."));

      // HSTS detail
      const hsts = res?.headers.get("strict-transport-security") || "";
      if (hsts) {
        const ma = parseInt(hsts.match(/max-age\s*=\s*(\d+)/i)?.[1] || "0", 10);
        if (ma < 15552000) // 180 days
          issues.push(issue("hsts-short", "info", "Security",
            "HSTS max-age is shorter than 180 days",
            "Increase max-age to at least 15552000 (180 days) and consider preload eligibility."));
        if (!/preload/i.test(hsts))
          issues.push(issue("hsts-no-preload", "info", "Security",
            "HSTS missing `preload` directive",
            "If you can guarantee HTTPS everywhere, add `preload` and submit to hstspreload.org."));
      }
    }

    const result: UrlCheckResult = {
      kind: "url",
      url,
      finalUrl,
      online,
      statusCode,
      ssl,
      loadTimeMs,
      pageSizeBytes,
      meta: {
        title: meta.title,
        description: meta.description,
        ogTitle: meta.ogTitle,
        ogDescription: meta.ogDescription,
        ogImage: meta.ogImage,
        twitterCard: meta.twitterCard,
        canonical: meta.canonical,
        favicon: meta.favicon,
        lang: meta.lang,
        structuredData: meta.structuredData,
      },
      mobileFriendly: { viewport: meta.viewport, responsiveHints: meta.responsiveHints },
      security: {
        httpsRedirect,
        headers: securityHeaders,
        poweredBy,
        exposedEnv,
        exposedGit,
        sourceMapExposed,
      },
      seoFiles: { robots: robotsOk, sitemap },
      accessibility: {
        htmlLang: !!meta.lang,
        imgsTotal: a11y.imgsTotal,
        imgsMissingAlt: a11y.imgsMissingAlt,
        h1Count: a11y.h1Count,
        formsTotal: a11y.formsTotal,
        inputsMissingLabel: a11y.inputsMissingLabel,
      },
      performance: {
        contentEncoding,
        cacheControl,
        inlineScripts,
        externalScripts,
        images,
      },
      intel,
      issues,
      scannedAt: new Date().toISOString(),
      manualChecks: [
        "Cross-browser visual check (Chrome, Safari, Firefox, Edge)",
        "Responsive layout on mobile / tablet / laptop / ultra-wide",
        "Keyboard-only navigation and screen reader pass",
        "Lighthouse run for FPS / CPU / memory metrics",
        "Load test (e.g. k6, JMeter) for 100 / 10k concurrent users",
        "Penetration test (OWASP Top 10, Burp Suite) for SQLi / XSS / CSRF",
        "End-to-end user journey (Playwright / Cypress)",
        "Network throttling test on 3G / offline / packet loss",
      ],
    };
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
