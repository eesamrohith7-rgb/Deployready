"use client";
import { useState } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import type { SiteIntel } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5 border-b border-border/60 last:border-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-right break-all max-w-[70%]">{value}</span>
    </div>
  );
}

function Yes() {
  return <span className="text-emerald-400">✓ Yes</span>;
}
function No() {
  return <span className="text-red-400">✗ No</span>;
}

function Block({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl bg-black/30">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-semibold text-sm">{title}</span>
        <ChevronDown
          size={16}
          className={`text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export default function SiteIntelligence({ intel }: { intel?: SiteIntel }) {
  if (!intel) return null;

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 grid place-items-center text-blue-300 shrink-0">
          <Globe2 size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Site Intelligence</h3>
          <p className="text-sm text-on-surface-variant">
            DNS, server, email auth, cookies, redirects, WAF — collected in one
            request. Click any panel to expand.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Block title="Server / Hosting" defaultOpen>
          <Row label="IP" value={<code className="font-mono text-xs">{intel.ip || "—"}</code>} />
          {intel.geo && (
            <>
              <Row label="Location" value={`${intel.geo.city || ""}${intel.geo.city ? ", " : ""}${intel.geo.region || ""}${intel.geo.country ? ` (${intel.geo.country})` : ""}`} />
              <Row label="Org" value={intel.geo.org || "—"} />
              <Row label="ASN" value={intel.geo.asn || "—"} />
              <Row label="Timezone" value={intel.geo.tz || "—"} />
            </>
          )}
          <Row label="CDN / WAF" value={intel.cdnWaf || "Unknown"} />
          <Row label="security.txt" value={intel.securityTxt ? <Yes /> : <No />} />
          {intel.carbonGrams !== undefined && (
            <Row label="CO₂ per visit (est.)" value={`${intel.carbonGrams} g`} />
          )}
        </Block>

        <Block title={`Redirect chain (${intel.redirects.length})`}>
          {intel.redirects.length === 0 ? (
            <div className="text-sm text-on-surface-variant">No redirects.</div>
          ) : (
            <ol className="text-xs font-mono space-y-1">
              {intel.redirects.map((r, i) => (
                <li key={i}>
                  <span className="text-on-surface-variant">[{r.status}]</span> {r.from}
                  {r.to ? <span className="text-emerald-400"> → {r.to}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </Block>

        <Block title="DNS Records">
          <Row label="A" value={intel.dns.a.join(", ") || "—"} />
          {intel.dns.aaaa.length > 0 && <Row label="AAAA" value={intel.dns.aaaa.join(", ")} />}
          <Row label="NS" value={intel.dns.ns.join(", ") || "—"} />
          <Row
            label="MX"
            value={
              intel.dns.mx.length
                ? intel.dns.mx.map((m) => `${m.priority} ${m.exchange}`).join(", ")
                : "—"
            }
          />
          <Row label="CAA" value={intel.dns.caa.length ? intel.dns.caa.join(", ") : <No />} />
          <Row
            label="SOA"
            value={intel.dns.soa ? `${intel.dns.soa.primary} (serial ${intel.dns.soa.serial})` : "—"}
          />
          <Row
            label="DNSSEC"
            value={intel.dns.dnssec.ds || intel.dns.dnssec.dnskey ? <Yes /> : <No />}
          />
          {intel.dns.txt.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-on-surface-variant cursor-pointer">
                TXT ({intel.dns.txt.length})
              </summary>
              <ul className="text-xs font-mono mt-1 space-y-1 break-all">
                {intel.dns.txt.map((t, i) => (
                  <li key={i} className="text-white/80">{t}</li>
                ))}
              </ul>
            </details>
          )}
        </Block>

        <Block title="Email Authentication">
          <Row label="SPF" value={intel.email.spf ? <code className="text-xs font-mono">{intel.email.spf}</code> : <No />} />
          <Row label="DMARC" value={intel.email.dmarc ? <code className="text-xs font-mono">{intel.email.dmarc}</code> : <No />} />
          <Row label="BIMI" value={intel.email.bimi ? <Yes /> : <No />} />
        </Block>

        {intel.rdap && (
          <Block title="WHOIS / RDAP">
            <Row label="Registrar" value={intel.rdap.registrar || "—"} />
            <Row label="Created" value={intel.rdap.created?.slice(0, 10) || "—"} />
            <Row label="Updated" value={intel.rdap.updated?.slice(0, 10) || "—"} />
            <Row label="Expires" value={intel.rdap.expires?.slice(0, 10) || "—"} />
            <Row label="Nameservers" value={intel.rdap.nameservers?.join(", ") || "—"} />
          </Block>
        )}

        <Block title={`Cookies (${intel.cookies.length})`}>
          {intel.cookies.length === 0 ? (
            <div className="text-sm text-on-surface-variant">No cookies set on response.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-on-surface-variant border-b border-border">
                  <th className="text-left py-1">Name</th>
                  <th>Secure</th>
                  <th>HttpOnly</th>
                  <th>SameSite</th>
                </tr>
              </thead>
              <tbody>
                {intel.cookies.map((c) => (
                  <tr key={c.name} className="border-b border-border/40">
                    <td className="font-mono py-1">{c.name}</td>
                    <td className="text-center">{c.secure ? <Yes /> : <No />}</td>
                    <td className="text-center">{c.httpOnly ? <Yes /> : <No />}</td>
                    <td className="text-center">{c.sameSite || <No />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>

        <Block title="Linked Pages">
          <Row label="Internal links" value={intel.linkedPages.internal} />
          <Row label="External links" value={intel.linkedPages.external} />
        </Block>
      </div>
    </section>
  );
}
