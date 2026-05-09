"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UrlCheckResult } from "@/lib/types";
import Hero from "./Hero";
import BentoTop from "./BentoTop";
import {
  CarbonCard,
  CookiesCard,
  CrawlRulesCard,
  DnsCard,
  DnssecCard,
  EmailCard,
  FirewallCard,
  HeadersCard,
  HostnamesCard,
  HstsCard,
  LinkedPagesCard,
  OpenPortsCard,
  PlaceholderCard,
  RedirectsCard,
  SecurityHeadersCard,
  SecurityTxtCard,
  ServerInfoCard,
  ServerLocationCard,
  SocialTagsCard,
  SslCard,
  TlsConnectionCard,
  WhoisCard,
} from "./Cards";

type CardKey =
  | "location"
  | "ssl"
  | "tls"
  | "whois"
  | "hostnames"
  | "headers"
  | "dns"
  | "secHeaders"
  | "hsts"
  | "dnssec"
  | "email"
  | "ports"
  | "firewall"
  | "cookies"
  | "redirects"
  | "linked"
  | "carbon"
  | "social"
  | "serverInfo"
  | "crawl"
  | "securityTxt"
  | "qualitySummary"
  | "tlsAudit"
  | "blockLists"
  | "threats"
  | "tlsClients";

const ALL_CARDS: { key: CardKey; label: string }[] = [
  { key: "location", label: "Server Location" },
  { key: "ssl", label: "SSL Certificate" },
  { key: "tls", label: "TLS Connection" },
  { key: "whois", label: "Domain Whois" },
  { key: "hostnames", label: "Host Names" },
  { key: "headers", label: "HTTP Headers" },
  { key: "dns", label: "DNS Records" },
  { key: "secHeaders", label: "Security Headers" },
  { key: "hsts", label: "HSTS Check" },
  { key: "dnssec", label: "DNSSEC" },
  { key: "email", label: "Email Configuration" },
  { key: "ports", label: "Open Ports" },
  { key: "firewall", label: "Firewall / WAF" },
  { key: "cookies", label: "Cookies" },
  { key: "redirects", label: "Redirects" },
  { key: "linked", label: "Linked Pages" },
  { key: "carbon", label: "Carbon Footprint" },
  { key: "social", label: "Social Tags" },
  { key: "serverInfo", label: "Server Info" },
  { key: "crawl", label: "Crawl Rules" },
  { key: "securityTxt", label: "security.txt" },
  { key: "qualitySummary", label: "Quality Summary (Lighthouse)" },
  { key: "tlsAudit", label: "TLS Security Audit" },
  { key: "blockLists", label: "Block Lists" },
  { key: "threats", label: "Threats" },
  { key: "tlsClients", label: "TLS Client Compatibility" },
];

export default function Scanner() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Awaiting target.");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<UrlCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<CardKey, boolean>>(() =>
    ALL_CARDS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<CardKey, boolean>),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const startRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phases = [
    "Resolving DNS via Cloudflare DoH...",
    "Negotiating TLS handshake...",
    "Fetching response headers...",
    "Probing TCP ports...",
    "Querying RDAP whois...",
    "Computing carbon footprint...",
    "Aggregating intelligence...",
  ];

  // Progress simulation while the single backend call runs
  useEffect(() => {
    if (!loading) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    startRef.current = Date.now();
    setProgress(2);
    setElapsedMs(0);
    setProgressLabel(phases[0]);
    let i = 0;
    tickRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
      setProgress((p) => {
        const next = p < 92 ? p + Math.max(1, Math.round((95 - p) / 18)) : p;
        const phaseIdx = Math.min(phases.length - 1, Math.floor((next / 92) * phases.length));
        if (phaseIdx !== i) {
          i = phaseIdx;
          setProgressLabel(phases[i]);
        }
        return next;
      });
    }, 220);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Hydrate last result on mount (used by /report route)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dr:lastScan");
      if (raw) setResult(JSON.parse(raw));
    } catch {}
  }, []);

  async function runScan(input?: string) {
    const target = (input ?? url).trim();
    if (!target) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch("/api/check-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as UrlCheckResult;
      setResult(data);
      try {
        sessionStorage.setItem("dr:lastScan", JSON.stringify(data));
      } catch {}
      setProgress(100);
      setProgressLabel("Scan complete.");
      setElapsedMs(Date.now() - startRef.current);
    } catch (e: any) {
      setError(e?.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `deployready-${new Date(result.scannedAt).getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }

  const intel = result?.intel;

  const cards = useMemo(() => {
    if (!result || !intel) return [];
    const map: Record<CardKey, React.ReactNode> = {
      location: <ServerLocationCard intel={intel} />,
      ssl: <SslCard result={result} />,
      tls: <TlsConnectionCard intel={intel} />,
      whois: <WhoisCard intel={intel} />,
      hostnames: <HostnamesCard intel={intel} />,
      headers: <HeadersCard intel={intel} />,
      dns: <DnsCard intel={intel} />,
      secHeaders: <SecurityHeadersCard result={result} intel={intel} />,
      hsts: <HstsCard intel={intel} />,
      dnssec: <DnssecCard intel={intel} />,
      email: <EmailCard intel={intel} />,
      ports: <OpenPortsCard intel={intel} />,
      firewall: <FirewallCard intel={intel} />,
      cookies: <CookiesCard intel={intel} />,
      redirects: <RedirectsCard intel={intel} />,
      linked: <LinkedPagesCard intel={intel} />,
      carbon: <CarbonCard result={result} intel={intel} />,
      social: <SocialTagsCard result={result} />,
      serverInfo: <ServerInfoCard result={result} intel={intel} />,
      crawl: <CrawlRulesCard intel={intel} />,
      securityTxt: <SecurityTxtCard intel={intel} />,
      qualitySummary: (
        <PlaceholderCard
          title="Quality Summary (Lighthouse)"
          reason="Performance / Accessibility / Best-Practices / SEO scores require a real Chromium run, not a single fetch."
          tool="Run Lighthouse locally or PageSpeed Insights API (set GOOGLE_PSI_KEY)."
        />
      ),
      tlsAudit: (
        <PlaceholderCard
          title="TLS Security Audit"
          reason="Heartbleed / POODLE / FREAK / LOGJAM / DROWN / ROBOT need active probing of the TLS stack."
          tool="testssl.sh, Qualys SSL Labs (ssllabs.com)."
        />
      ),
      blockLists: (
        <PlaceholderCard
          title="Block Lists"
          reason="Checking AdGuard / OpenDNS / Quad9 / Cloudflare etc. requires querying each provider's resolver."
          tool="urlhaus.abuse.ch, urlvoid.com, blacklistchecker.com."
        />
      ),
      threats: (
        <PlaceholderCard
          title="Threats / Safe Browsing"
          reason="Google Safe Browsing & phishing feeds require an authenticated API key."
          tool="Google Safe Browsing API (set GSB_API_KEY), VirusTotal."
        />
      ),
      tlsClients: (
        <PlaceholderCard
          title="TLS Client Compatibility"
          reason="The compatibility matrix (Android 4.x, IE11, Java 6, etc.) is computed from full cipher/protocol negotiation across hundreds of clients."
          tool="Qualys SSL Labs report."
        />
      ),
    };
    return ALL_CARDS.filter((c) => enabled[c.key]).map((c) => (
      <div key={c.key}>{map[c.key]}</div>
    ));
  }, [result, intel, enabled]);

  // ------- UI: pre-scan = Hero, scanning/result = dashboard -------
  if (!loading && !result) {
    return <Hero url={url} setUrl={setUrl} onSubmit={runScan} loading={loading} />;
  }

  const target = result?.url || url;
  const host = (() => {
    try {
      return new URL(target).hostname;
    } catch {
      return target;
    }
  })();
  const scanId = result ? `SCAN_${new Date(result.scannedAt).getTime().toString(36).toUpperCase()}` : "SCAN_LIVE";
  const totalCards = ALL_CARDS.length;
  const enabledCount = Object.values(enabled).filter(Boolean).length;
  const skipped = totalCards - enabledCount;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      {/* Scan header & actions */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="font-sans text-headline-lg text-on-background mb-2">{host || "—"}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-container-highest rounded-DEFAULT font-mono text-code-md text-primary">
                <span
                  className={`w-2 h-2 rounded-full bg-primary ${loading ? "animate-pulse" : ""}`}
                />
                {scanId}
              </span>
              <span className="font-mono text-code-md text-on-surface-variant">
                {result
                  ? `Target acquired in ${(elapsedMs / 1000 || (result.loadTimeMs || 0) / 1000).toFixed(2)}s.`
                  : "Target acquired. Executing remote diagnostics."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex-1 md:flex-none px-4 py-2 border border-surface-container-highest rounded-DEFAULT font-mono text-code-md text-on-background hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters
            </button>
            <button
              type="button"
              onClick={exportJson}
              disabled={!result}
              className="flex-1 md:flex-none px-4 py-2 border border-surface-container-highest rounded-DEFAULT font-mono text-code-md text-on-background hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">data_object</span>
              JSON
            </button>
            <a
              href="/report"
              className={`flex-1 md:flex-none px-4 py-2 border border-surface-container-highest rounded-DEFAULT font-mono text-code-md text-on-background hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 ${result ? "" : "opacity-40 pointer-events-none"}`}
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Report
            </a>
          </div>
        </div>

        <div className="thin-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between items-center font-mono text-code-md text-on-surface-variant">
          <span className="term-prompt">{progressLabel}</span>
          <span>
            <span className="text-success">{Math.round((progress / 100) * enabledCount)}</span>/
            {totalCards} jobs
            {skipped > 0 ? <span className="text-warning"> · {skipped} skipped</span> : null}
            <span> · {(elapsedMs / 1000).toFixed(1)}s · {progress}%</span>
          </span>
        </div>

        {filtersOpen && (
          <div className="bento p-3 flex flex-wrap gap-2">
            {ALL_CARDS.map((c) => (
              <label
                key={c.key}
                className={`text-xs px-2 py-1 rounded-DEFAULT border cursor-pointer font-mono ${enabled[c.key] ? "border-primary-container text-primary" : "border-outline-variant text-on-surface-variant"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={enabled[c.key]}
                  onChange={(e) =>
                    setEnabled((s) => ({ ...s, [c.key]: e.target.checked }))
                  }
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="bento p-4 border-error/40 text-error font-mono text-code-md">{error}</div>
      )}

      {result && intel && <BentoTop intel={intel} result={result} />}

      {loading && !result && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ALL_CARDS.filter((c) => enabled[c.key])
            .slice(0, 9)
            .map((c) => (
              <div key={c.key} className="bento animate-pulse">
                <div className="border-b border-[#1f1f1f] px-4 py-3">
                  <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant opacity-60">
                    {c.label}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="h-3 bg-surface-container-highest rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-container-highest rounded w-1/2 mb-2" />
                  <div className="h-3 bg-surface-container-highest rounded w-2/3" />
                </div>
              </div>
            ))}
        </section>
      )}

      {result && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{cards}</section>
      )}
    </main>
  );
}
