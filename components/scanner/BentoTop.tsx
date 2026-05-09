"use client";
import type { UrlCheckResult, SiteIntel } from "@/lib/types";

const OK = "#4ade80";
const WARN = "#fbbf24";
const ERR = "#ffb4ab";

function dot(color: string) {
  return <span className="w-3 h-3 rounded-full" style={{ background: color }} />;
}

function CardHeader({
  icon,
  label,
  right,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start mb-4">
      <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </span>
      {right}
    </div>
  );
}

// ----- TLS Grade -----
function tlsGrade(intel: SiteIntel): { grade: string; tone: "ok" | "warn" | "err"; note: string } {
  const t = intel.tlsDetail || {};
  if (!t.protocol) return { grade: "F", tone: "err", note: "No TLS detected" };
  let score = 0;
  if (/TLSv1\.3/i.test(t.protocol)) score += 4;
  else if (/TLSv1\.2/i.test(t.protocol)) score += 2;
  if (t.forwardSecrecy) score += 2;
  if (t.ocspStapling) score += 1;
  if (t.alpn === "h2") score += 1;
  if (intel.dns.dnssec.ds && intel.dns.dnssec.dnskey) score += 1;
  if (intel.cdnWaf) score += 1;
  const map: Record<number, string> = { 10: "A+", 9: "A+", 8: "A", 7: "A", 6: "B", 5: "B", 4: "C", 3: "C", 2: "D", 1: "F", 0: "F" };
  const grade = map[Math.min(10, score)] || "C";
  const tone: "ok" | "warn" | "err" = grade.startsWith("A") ? "ok" : grade === "B" ? "warn" : "err";
  const note = grade.startsWith("A") ? "Optimal Configuration" : grade === "B" ? "Good — minor gaps" : "Insecure / weak";
  return { grade, tone, note };
}

export default function BentoTop({ intel, result }: { intel: SiteIntel; result: UrlCheckResult }) {
  const tls = tlsGrade(intel);
  const ssl = result.ssl;
  const sslDays = ssl?.daysRemaining;
  const sslOk = ssl?.valid && (sslDays === undefined || sslDays > 14);
  const sslTone: "ok" | "warn" | "err" =
    !ssl?.valid ? "err" : sslDays !== undefined && sslDays < 14 ? "warn" : "ok";

  const headers = intel.headers || {};
  const has = (k: string) => Object.keys(headers).some((h) => h.toLowerCase() === k);
  const headerChecks = [
    { k: "Strict-Transport-Security", ok: has("strict-transport-security") },
    { k: "X-Content-Type-Options", ok: has("x-content-type-options") },
    { k: "Content-Security-Policy", ok: has("content-security-policy") },
    { k: "X-Frame-Options", ok: has("x-frame-options") },
  ];
  const passed = headerChecks.filter((c) => c.ok).length;
  const headerGrade = passed === 4 ? "A" : passed === 3 ? "B" : passed === 2 ? "C" : "F";
  const headerTone: "ok" | "warn" | "err" = passed === 4 ? "ok" : passed >= 2 ? "warn" : "err";

  const ports = intel.ports || { open: [], closed: [] };
  const risky = ports.open.filter((p) => [21, 22, 23, 3306, 3389, 5432, 6379].includes(p));
  const portRows = [...new Set([...ports.open, ...risky])]
    .slice(0, 5)
    .map((p) => ({ port: p, state: "open", svc: serviceName(p) }))
    .concat(
      ports.closed.slice(0, Math.max(0, 5 - ports.open.length)).map((p) => ({
        port: p,
        state: "filtered",
        svc: serviceName(p),
      })),
    )
    .slice(0, 6);

  const email = intel.email || {};
  const emailOk = !!(email.spf && email.dmarc);

  const rdap = intel.rdap;
  const domainAge = (() => {
    if (!rdap?.created) return null;
    const start = new Date(rdap.created).getTime();
    if (isNaN(start)) return null;
    const days = (Date.now() - start) / 86400000;
    if (days < 0) return null;
    const years = Math.floor(days / 365);
    const months = Math.floor((days - years * 365) / 30);
    return `${years} Year${years === 1 ? "" : "s"}, ${months} Month${months === 1 ? "" : "s"}`;
  })();

  const carbon = intel.carbonGrams;
  const carbonRating =
    carbon === undefined
      ? null
      : carbon < 0.5
      ? "Excellent — cleaner than 90%"
      : carbon < 1
      ? "Good — cleaner than 70%"
      : carbon < 2
      ? "Fair — average"
      : "High — review payload";

  return (
    <section className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-4 auto-rows-min">
      {/* TLS Grade */}
      <div className={`col-span-1 md:col-span-4 lg:col-span-3 bento p-6 flex flex-col justify-between ${toneGlow(tls.tone)} relative overflow-hidden min-h-[180px]`}>
        <div className="absolute -top-10 -right-10 text-[120px] text-surface-container-highest opacity-20 select-none material-symbols-outlined icon-fill">
          workspace_premium
        </div>
        <CardHeader icon="security" label="TLS Grade" right={dot(toneColor(tls.tone))} />
        <div className="z-10">
          <div className="font-sans text-headline-xl text-on-background leading-none">{tls.grade}</div>
          <div className="font-mono text-code-md text-primary mt-2">{tls.note}</div>
        </div>
      </div>

      {/* SSL Certificate */}
      <div className={`col-span-1 md:col-span-4 lg:col-span-5 bento p-6 ${toneGlow(sslTone)}`}>
        <CardHeader
          icon="lock"
          label="SSL Certificate"
          right={
            <span
              className="px-2 py-1 font-mono text-code-md rounded-DEFAULT text-xs border"
              style={{
                color: sslOk ? OK : sslTone === "warn" ? WARN : ERR,
                background: `${sslOk ? OK : sslTone === "warn" ? WARN : ERR}1a`,
                borderColor: `${sslOk ? OK : sslTone === "warn" ? WARN : ERR}40`,
              }}
            >
              {ssl?.valid ? (sslTone === "warn" ? "Expiring" : "Valid") : "Invalid"}
            </span>
          }
        />
        <div className="grid grid-cols-2 gap-4 font-mono text-code-md">
          <div>
            <div className="text-on-surface-variant mb-1 text-xs">Issuer</div>
            <div className="text-on-background truncate">{ssl?.issuer || "—"}</div>
          </div>
          <div>
            <div className="text-on-surface-variant mb-1 text-xs">Expires In</div>
            <div className="text-on-background">{sslDays !== undefined ? `${sslDays} Days` : "—"}</div>
          </div>
          <div>
            <div className="text-on-surface-variant mb-1 text-xs">Protocol</div>
            <div className="text-on-background">{ssl?.protocol || intel.tlsDetail?.protocol || "—"}</div>
          </div>
          <div>
            <div className="text-on-surface-variant mb-1 text-xs">Cipher</div>
            <div className="text-on-background truncate">{intel.tlsDetail?.cipher || "—"}</div>
          </div>
        </div>
      </div>

      {/* Active Threats (we don't actually probe Safe Browsing — be honest) */}
      <div className="col-span-1 md:col-span-8 lg:col-span-4 bento p-6 bento-glow-warn">
        <CardHeader icon="bug_report" label="Active Threats" right={dot(WARN)} />
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-highest p-3 rounded-DEFAULT">
            <span className="material-symbols-outlined text-primary text-[28px]">verified_user</span>
          </div>
          <div>
            <div className="font-sans text-headline-md text-on-background">Not Scanned</div>
            <div className="font-mono text-code-md text-on-surface-variant text-sm mt-1">
              Google Safe Browsing requires API key. Set <code className="text-primary">GSB_API_KEY</code> to enable.
            </div>
          </div>
        </div>
      </div>

      {/* Security Headers */}
      <div className={`col-span-1 md:col-span-4 lg:col-span-4 bento p-6 ${toneGlow(headerTone)}`}>
        <CardHeader
          icon="view_list"
          label="Security Headers"
          right={
            <div
              className="w-8 h-8 rounded-DEFAULT bg-primary-container/20 text-primary-container flex items-center justify-center font-sans text-headline-md border border-primary-container/50"
              style={{
                color: toneColor(headerTone),
                borderColor: toneColor(headerTone) + "80",
                background: toneColor(headerTone) + "1a",
              }}
            >
              {headerGrade}
            </div>
          }
        />
        <ul className="font-mono text-code-md text-sm flex flex-col gap-2 mt-2">
          {headerChecks.map((c) => (
            <li
              key={c.k}
              className={`flex items-center gap-2 ${c.ok ? "text-on-background" : "text-warning"}`}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ color: c.ok ? OK : WARN }}>
                {c.ok ? "check" : "close"}
              </span>
              {c.k}
              {!c.ok && <span className="opacity-60">(Missing)</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Port Scan */}
      <div className="col-span-1 md:col-span-4 lg:col-span-4 bg-[#000000] border border-[#1f1f1f] rounded-DEFAULT p-6 flex flex-col">
        <div className="flex justify-between items-start mb-4 border-b border-[#1f1f1f] pb-2">
          <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">dns</span>
            Port Scan
          </span>
          <span className="font-mono text-code-md text-primary text-xs">TCP/SYN</span>
        </div>
        <div className="font-mono text-code-md text-sm flex flex-col gap-1">
          <div className="flex justify-between text-on-surface-variant">
            <span className="w-16">PORT</span>
            <span className="w-24">STATE</span>
            <span>SERVICE</span>
          </div>
          {portRows.map((r) => (
            <div key={r.port} className="flex justify-between text-on-background">
              <span className="w-16">{r.port}/tcp</span>
              <span className="w-24" style={{ color: r.state === "open" ? OK : ERR }}>
                {r.state}
              </span>
              <span>{r.svc}</span>
            </div>
          ))}
          <div className="mt-2 text-warning term-prompt">
            {ports.closed.length} closed/filtered ports omitted
          </div>
        </div>
      </div>

      {/* DNS Config */}
      <div className="col-span-1 md:col-span-8 lg:col-span-4 bento p-6">
        <CardHeader
          icon="hub"
          label="DNS Config"
          right={
            <span className="px-2 py-1 bg-surface-container-highest text-on-background font-mono text-code-md rounded-DEFAULT text-xs">
              {intel.cdnWaf || "Origin"}
            </span>
          }
        />
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-code-md text-sm">
          {row("A", intel.dns.a[0])}
          {row("AAAA", intel.dns.aaaa[0])}
          {row("MX", intel.dns.mx[0]?.exchange)}
          {row("TXT", intel.email.spf || intel.dns.txt[0])}
        </div>
      </div>

      {/* Bottom small-metric row */}
      <div className="col-span-1 md:col-span-8 lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <SmallMetric
          icon="mail"
          label="Email Security"
          title="DMARC & SPF"
          right={
            <span
              className="px-2 py-1 font-mono text-code-md rounded-DEFAULT text-xs border"
              style={{
                color: emailOk ? OK : WARN,
                background: (emailOk ? OK : WARN) + "1a",
                borderColor: (emailOk ? OK : WARN) + "33",
              }}
            >
              {emailOk ? "Configured" : email.spf || email.dmarc ? "Partial" : "Missing"}
            </span>
          }
        />
        <SmallMetric
          icon="public"
          label="Domain Age"
          title={domainAge || "—"}
          right={
            <span className="font-mono text-code-md text-on-surface-variant text-xs">
              {rdap?.registrar || ""}
            </span>
          }
        />
        <SmallMetric
          icon="eco"
          label="Carbon Rating"
          title={carbonRating || "—"}
          right={
            <span className="font-sans text-headline-md text-primary leading-none">
              {carbon !== undefined ? `${carbon}g` : "—"}
            </span>
          }
        />
      </div>
    </section>
  );
}

function row(k: string, v?: string) {
  return (
    <>
      <div className="text-on-surface-variant">{k}</div>
      <div className="text-on-background truncate">{v || "—"}</div>
    </>
  );
}

function SmallMetric({
  icon,
  label,
  title,
  right,
}: {
  icon: string;
  label: string;
  title: string;
  right: React.ReactNode;
}) {
  return (
    <div className="bento p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-surface-container-highest p-2 rounded-DEFAULT">
          <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        </div>
        <div>
          <div className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant">
            {label}
          </div>
          <div className="font-mono text-code-md text-on-background">{title}</div>
        </div>
      </div>
      {right}
    </div>
  );
}

function toneGlow(t: "ok" | "warn" | "err") {
  return t === "ok" ? "bento-glow-ok" : t === "warn" ? "bento-glow-warn" : "bento-glow-err";
}
function toneColor(t: "ok" | "warn" | "err") {
  return t === "ok" ? OK : t === "warn" ? WARN : ERR;
}
function serviceName(p: number) {
  return (
    {
      21: "ftp",
      22: "ssh",
      25: "smtp",
      53: "dns",
      80: "http",
      110: "pop3",
      143: "imap",
      443: "https",
      465: "smtps",
      587: "submission",
      993: "imaps",
      995: "pop3s",
      3306: "mysql",
      3389: "rdp",
      5432: "postgres",
      6379: "redis",
      8080: "http-alt",
      8443: "https-alt",
    } as Record<number, string>
  )[p] || "—";
}
