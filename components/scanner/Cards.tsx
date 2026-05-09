"use client";
import { Info, RefreshCw } from "lucide-react";
import type { UrlCheckResult, SiteIntel } from "@/lib/types";

const Yes = () => <span className="text-success font-mono">✓ Yes</span>;
const No = () => <span className="text-error font-mono">✗ No</span>;
const NA = () => <span className="text-on-surface-variant">—</span>;

export function Card({
  title,
  info,
  children,
  onRefresh,
}: {
  title: string;
  info?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <div className="bento flex flex-col font-mono">
      <div className="border-b border-[#1f1f1f] px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant">
          {title}
        </span>
        <div className="flex items-center gap-2 text-on-surface-variant">
          {info && (
            <button title={info} className="hover:text-primary">
              <Info size={13} />
            </button>
          )}
          {onRefresh && (
            <button onClick={onRefresh} className="hover:text-primary" title="Re-run">
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 py-3 text-code-md text-on-background">{children}</div>
    </div>
  );
}

export function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-dashed border-[#1f1f1f] last:border-b-0">
      <span className="text-on-surface-variant">{k}</span>
      <span className="text-on-background text-right break-words">{v ?? <NA />}</span>
    </div>
  );
}

// ----- Individual cards -----
type R = UrlCheckResult;

export function ServerLocationCard({ intel }: { intel: SiteIntel }) {
  const g = intel.geo;
  return (
    <Card title="Server Location" info="GeoIP via ip-api.com (free, ~45 req/min)">
      {g ? (
        <>
          <Row k="City" v={`${g.city || "—"}, ${g.region || ""}`} />
          <Row k="Country" v={g.country} />
          <Row k="Timezone" v={g.tz} />
          <Row k="Org" v={g.org} />
          <Row k="ASN" v={g.asn} />
          <Row k="Lat / Lon" v={g.lat && g.lon ? `${g.lat.toFixed(2)}, ${g.lon.toFixed(2)}` : <NA />} />
          {g.lat !== undefined && g.lon !== undefined && <MiniMap lat={g.lat} lon={g.lon} />}
        </>
      ) : (
        <div className="text-on-surface-variant text-xs">Geolocation unavailable.</div>
      )}
    </Card>
  );
}

function MiniMap({ lat, lon }: { lat: number; lon: number }) {
  // equirectangular projection on a 360x180 box
  const x = ((lon + 180) / 360) * 360;
  const y = ((90 - lat) / 180) * 180;
  return (
    <div className="mt-3 rounded border border-border overflow-hidden">
      <svg viewBox="0 0 360 180" className="w-full block bg-background" aria-label="server location map">
        <rect x="0" y="0" width="360" height="180" fill="#0d1117" />
        {/* very rough continent outlines as a single path (approx world map dots grid) */}
        <g fill="#21262d">
          {Array.from({ length: 18 * 36 }).map((_, i) => {
            const cx = (i % 36) * 10 + 5;
            const cy = Math.floor(i / 36) * 10 + 5;
            // crude land mask: skip oceans by lat/lon bands
            const lo = (cx / 360) * 360 - 180;
            const la = 90 - (cy / 180) * 180;
            const land =
              (la > 10 && la < 70 && lo > -130 && lo < -60) ||
              (la > -55 && la < 12 && lo > -85 && lo < -35) ||
              (la > 35 && la < 70 && lo > -10 && lo < 60) ||
              (la > -35 && la < 35 && lo > -20 && lo < 55) ||
              (la > 0 && la < 75 && lo > 60 && lo < 150) ||
              (la > -45 && la < -10 && lo > 110 && lo < 155);
            return land ? <circle key={i} cx={cx} cy={cy} r={1.4} /> : null;
          })}
        </g>
        <circle cx={x} cy={y} r={5} fill="#ff7b72">
          <animate attributeName="r" values="5;9;5" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx={x} cy={y} r={2} fill="#fff" />
      </svg>
    </div>
  );
}

export function SslCard({ result }: { result: R }) {
  const s = result.ssl;
  return (
    <Card title="SSL Certificate" info="From TLS handshake to port 443">
      <Row k="Valid" v={s.valid ? <Yes /> : <No />} />
      <Row k="Issuer" v={s.issuer} />
      <Row k="Protocol" v={s.protocol} />
      <Row k="Expires" v={s.validTo?.slice(0, 16)} />
      <Row k="Days remaining" v={s.daysRemaining} />
    </Card>
  );
}

export function TlsConnectionCard({ intel }: { intel: SiteIntel }) {
  const t = intel.tlsDetail || {};
  return (
    <Card title="TLS Connection">
      <Row k="Protocol" v={t.protocol} />
      <Row k="Cipher Suite" v={t.cipher} />
      <Row k="ALPN" v={t.alpn} />
      <Row k="Forward Secrecy" v={t.forwardSecrecy === undefined ? <NA /> : t.forwardSecrecy ? <Yes /> : <No />} />
      <Row k="Session Resumption" v={t.sessionResumption ? <Yes /> : <No />} />
      <Row k="OCSP Stapling" v={t.ocspStapling === undefined ? <NA /> : t.ocspStapling ? <Yes /> : <No />} />
    </Card>
  );
}

export function HostnamesCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title="Host Names">
      {(intel.hostnames || []).length === 0 ? (
        <div className="text-on-surface-variant text-xs">No hostnames resolved.</div>
      ) : (
        <ul className="text-xs">
          {(intel.hostnames || []).map((h) => (
            <li key={h} className="font-mono py-0.5">{h}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function HeadersCard({ intel }: { intel: SiteIntel }) {
  const h = intel.headers || {};
  const keys = Object.keys(h).sort();
  return (
    <Card title="HTTP Headers" info={`${keys.length} headers`}>
      <div className="max-h-72 overflow-auto">
        {keys.map((k) => (
          <Row key={k} k={k} v={<code className="text-[11px]">{h[k]}</code>} />
        ))}
        {keys.length === 0 && <div className="text-on-surface-variant text-xs">No headers captured.</div>}
      </div>
    </Card>
  );
}

export function DnsCard({ intel }: { intel: SiteIntel }) {
  const d = intel.dns;
  return (
    <Card title="DNS Records">
      <Row k="A" v={d.a.length ? d.a.join(", ") : <No />} />
      {d.aaaa.length > 0 && <Row k="AAAA" v={d.aaaa.join(", ")} />}
      <Row k="NS" v={d.ns.join(", ") || <No />} />
      <Row k="MX" v={d.mx.length ? d.mx.map((m) => `${m.priority} ${m.exchange}`).join(", ") : <No />} />
      <Row k="CAA" v={d.caa.length ? d.caa.join(", ") : <No />} />
      <Row k="SOA" v={d.soa ? `${d.soa.primary} (serial ${d.soa.serial})` : <NA />} />
      {d.txt.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-on-surface-variant text-xs">TXT ({d.txt.length})</summary>
          <ul className="mt-1 space-y-1 break-all text-[11px]">
            {d.txt.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

export function SecurityHeadersCard({ result, intel }: { result: R; intel: SiteIntel }) {
  const has = (k: string) => Object.keys(intel.headers || {}).some((h) => h.toLowerCase() === k);
  const list: { k: string; ok: boolean }[] = [
    { k: "Content-Security-Policy", ok: has("content-security-policy") },
    { k: "Strict-Transport-Security", ok: has("strict-transport-security") },
    { k: "X-Frame-Options", ok: has("x-frame-options") },
    { k: "X-Content-Type-Options", ok: has("x-content-type-options") },
    { k: "Referrer-Policy", ok: has("referrer-policy") },
    { k: "Permissions-Policy", ok: has("permissions-policy") },
    { k: "Cross-Origin-Opener-Policy", ok: has("cross-origin-opener-policy") },
    { k: "Cross-Origin-Resource-Policy", ok: has("cross-origin-resource-policy") },
    { k: "Cross-Origin-Embedder-Policy", ok: has("cross-origin-embedder-policy") },
  ];
  return (
    <Card title="HTTP Security">
      {list.map((it) => (
        <Row key={it.k} k={it.k} v={it.ok ? <Yes /> : <No />} />
      ))}
    </Card>
  );
}

export function HstsCard({ intel }: { intel: SiteIntel }) {
  const h = (intel.headers || {})["strict-transport-security"] || (intel.headers || {})["Strict-Transport-Security"];
  if (!h) {
    return (
      <Card title="HSTS Check">
        <Row k="HSTS Enabled" v={<No />} />
      </Card>
    );
  }
  const ma = parseInt(h.match(/max-age\s*=\s*(\d+)/i)?.[1] || "0", 10);
  const incSub = /includeSubDomains/i.test(h);
  const preload = /preload/i.test(h);
  return (
    <Card title="HSTS Check">
      <Row k="HSTS Enabled" v={<Yes />} />
      <Row k="max-age" v={`${ma} (${Math.round(ma / 86400)} days)`} />
      <Row k="includeSubDomains" v={incSub ? <Yes /> : <No />} />
      <Row k="preload" v={preload ? <Yes /> : <No />} />
    </Card>
  );
}

export function DnssecCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title="DNSSEC" info="DS / DNSKEY via Cloudflare DoH">
      <Row k="DS present" v={intel.dns.dnssec.ds ? <Yes /> : <No />} />
      <Row k="DNSKEY present" v={intel.dns.dnssec.dnskey ? <Yes /> : <No />} />
    </Card>
  );
}

export function EmailCard({ intel }: { intel: SiteIntel }) {
  const e = intel.email;
  return (
    <Card title="Email Configuration">
      <Row k="SPF" v={e.spf ? <code className="text-[11px]">{e.spf}</code> : <No />} />
      <Row k="DMARC" v={e.dmarc ? <code className="text-[11px]">{e.dmarc}</code> : <No />} />
      <Row k="BIMI" v={e.bimi ? <Yes /> : <No />} />
      <Row k="DKIM" v={<span className="text-on-surface-variant text-[11px]">selector-specific — manual lookup</span>} />
      <Row k="MX" v={intel.dns.mx.length ? intel.dns.mx.map((m) => `${m.priority} ${m.exchange}`).join(", ") : <No />} />
    </Card>
  );
}

export function OpenPortsCard({ intel }: { intel: SiteIntel }) {
  const p = intel.ports || { open: [], closed: [] };
  return (
    <Card title="Open Ports" info="TCP probes from this server. May differ from your edge firewall.">
      <Row k="Open" v={p.open.length ? p.open.join(", ") : <span className="text-warning">none detected</span>} />
      <details className="mt-2">
        <summary className="cursor-pointer text-on-surface-variant text-xs">Closed / filtered ({p.closed.length})</summary>
        <div className="text-[11px] text-on-surface-variant mt-1">{p.closed.join(", ")}</div>
      </details>
    </Card>
  );
}

export function FirewallCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title="Firewall / WAF" info="Detected from response headers (cf-ray, x-vercel-id, etc.)">
      <Row k="Detected" v={intel.cdnWaf ? <span className="text-success">{intel.cdnWaf}</span> : <No />} />
    </Card>
  );
}

export function CookiesCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title={`Cookies (${intel.cookies.length})`}>
      {intel.cookies.length === 0 ? (
        <div className="text-on-surface-variant text-xs">No cookies set on response.</div>
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-on-surface-variant">
              <th className="text-left py-1">Name</th>
              <th>Secure</th>
              <th>HttpOnly</th>
              <th>SameSite</th>
            </tr>
          </thead>
          <tbody>
            {intel.cookies.map((c) => (
              <tr key={c.name} className="border-t border-border/40">
                <td className="font-mono py-1">{c.name}</td>
                <td className="text-center">{c.secure ? <Yes /> : <No />}</td>
                <td className="text-center">{c.httpOnly ? <Yes /> : <No />}</td>
                <td className="text-center">{c.sameSite || <No />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export function RedirectsCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title={`Redirects (${intel.redirects.length})`}>
      {intel.redirects.length === 0 ? (
        <div className="text-on-surface-variant text-xs">No redirects.</div>
      ) : (
        <ol className="text-[11px] font-mono space-y-1">
          {intel.redirects.map((r, i) => (
            <li key={i}>
              <span className="text-warning">[{r.status}]</span> {r.from}
              {r.to ? <span className="text-success"> → {r.to}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function LinkedPagesCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title="Linked Pages">
      <Row k="Internal" v={intel.linkedPages.internal} />
      <Row k="External" v={intel.linkedPages.external} />
    </Card>
  );
}

export function CarbonCard({ result, intel }: { result: R; intel: SiteIntel }) {
  return (
    <Card title="Carbon Footprint" info="websitecarbon.com formula: ~1.8 kWh/GB · 442g CO₂/kWh">
      <Row k="HTML size" v={result.pageSizeBytes ? `${(result.pageSizeBytes / 1024).toFixed(1)} KB` : <NA />} />
      <Row k="CO₂ per visit" v={intel.carbonGrams !== undefined ? `${intel.carbonGrams} g` : <NA />} />
    </Card>
  );
}

export function SocialTagsCard({ result }: { result: R }) {
  const m = result.meta;
  return (
    <Card title="Social Tags">
      <Row k="Title" v={m.title} />
      <Row k="Description" v={m.description} />
      <Row k="Canonical" v={m.canonical} />
      <Row k="OG title" v={m.ogTitle} />
      <Row k="OG image" v={m.ogImage ? <span className="text-success">present</span> : <No />} />
      <Row k="Twitter card" v={m.twitterCard} />
    </Card>
  );
}

export function ServerInfoCard({ result, intel }: { result: R; intel: SiteIntel }) {
  return (
    <Card title="Server Info">
      <Row k="IP" v={intel.ip} />
      <Row k="Org" v={intel.geo?.org} />
      <Row k="ASN" v={intel.geo?.asn} />
      <Row k="Status" v={`${result.statusCode || "?"} (${result.loadTimeMs ?? "?"}ms)`} />
      <Row k="Provider" v={intel.cdnWaf} />
    </Card>
  );
}

export function CrawlRulesCard({ intel }: { intel: SiteIntel }) {
  const robots = intel.robots || "";
  if (!robots) {
    return (
      <Card title="Crawl Rules">
        <div className="text-on-surface-variant text-xs">No /robots.txt found.</div>
      </Card>
    );
  }
  const lines = robots.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).slice(0, 18);
  return (
    <Card title="Crawl Rules" info="From /robots.txt">
      <pre className="text-[11px] whitespace-pre-wrap leading-snug">{lines.join("\n")}</pre>
    </Card>
  );
}

export function WhoisCard({ intel }: { intel: SiteIntel }) {
  const r = intel.rdap;
  return (
    <Card title="Domain Whois (RDAP)">
      {!r ? (
        <div className="text-on-surface-variant text-xs">RDAP unavailable for this TLD.</div>
      ) : (
        <>
          <Row k="Registrar" v={r.registrar} />
          <Row k="Created" v={r.created?.slice(0, 10)} />
          <Row k="Updated" v={r.updated?.slice(0, 10)} />
          <Row k="Expires" v={r.expires?.slice(0, 10)} />
          <Row k="Nameservers" v={r.nameservers?.join(", ")} />
        </>
      )}
    </Card>
  );
}

export function SecurityTxtCard({ intel }: { intel: SiteIntel }) {
  return (
    <Card title="security.txt">
      <Row k="/.well-known/security.txt" v={intel.securityTxt ? <Yes /> : <No />} />
    </Card>
  );
}

// Honest "not automated" cards
export function PlaceholderCard({
  title,
  reason,
  tool,
}: {
  title: string;
  reason: string;
  tool: string;
}) {
  return (
    <Card title={title}>
      <div className="text-[12px] text-on-surface-variant leading-relaxed">
        <div className="text-warning mb-1">Not automated</div>
        <div>{reason}</div>
        <div className="mt-2">
          <span className="k">Recommended:</span> <span className="text-primary">{tool}</span>
        </div>
      </div>
    </Card>
  );
}
