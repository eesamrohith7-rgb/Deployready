import type { ModuleResult } from "../types";
import tls from "node:tls";
import { deriveSecurityIssues } from "./_security-rules";
import { scoreFromIssues, riskFromIssues } from "../score";

function tlsInspect(host: string, port = 443): Promise<{
  valid: boolean;
  protocol?: string;
  cipher?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  san?: string[];
  error?: string;
}> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, timeout: 8000 },
      () => {
        const cert = socket.getPeerCertificate(true) as any;
        const cipher = socket.getCipher();
        const validTo = cert?.valid_to ? new Date(cert.valid_to) : undefined;
        const daysRemaining = validTo ? Math.floor((validTo.getTime() - Date.now()) / 86400000) : undefined;
        resolve({
          valid: socket.authorized,
          protocol: socket.getProtocol() || undefined,
          cipher: cipher?.name,
          issuer: cert?.issuer?.O || cert?.issuer?.CN,
          validFrom: cert?.valid_from,
          validTo: cert?.valid_to,
          daysRemaining,
          san: (cert?.subjectaltname || "").split(/,\s*/).map((s: string) => s.replace(/^DNS:/, "")),
        });
        socket.end();
      },
    );
    socket.on("error", (e) => resolve({ valid: false, error: String(e?.message || e) }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ valid: false, error: "TLS handshake timeout" });
    });
  });
}

export async function runSecurity(url: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const u = new URL(url);
  const isHttps = u.protocol === "https:";
  const cert = isHttps ? await tlsInspect(u.hostname) : { valid: false, error: "Not HTTPS" };

  const res = await fetch(url, { redirect: "follow" }).catch((e) => ({ ok: false, headers: new Headers(), status: 0, error: String(e) }) as any);
  const headersObj: Record<string, string> = {};
  if (res?.headers && typeof (res.headers as any).forEach === "function") {
    (res.headers as Headers).forEach((v, k) => (headersObj[k.toLowerCase()] = v));
  }

  const has = (k: string) => Boolean(headersObj[k.toLowerCase()]);

  // Probe sensitive paths
  const sensitivePaths = ["/.env", "/.git/config", "/wp-config.php", "/server-status", "/phpinfo.php"];
  const exposed: string[] = [];
  await Promise.all(
    sensitivePaths.map(async (p) => {
      try {
        const r = await fetch(new URL(p, u), { method: "GET", redirect: "manual" });
        if (r.status === 200) exposed.push(p);
      } catch {}
    }),
  );

  const issues = deriveSecurityIssues({
    isHttps,
    certDaysRemaining: cert.daysRemaining,
    hstsPresent: has("strict-transport-security"),
    cspPresent: has("content-security-policy"),
    xctoPresent: has("x-content-type-options"),
    xfoOrFramesAncestorsPresent: has("x-frame-options") || has("content-security-policy"),
    referrerPresent: has("referrer-policy"),
    permissionsPresent: has("permissions-policy"),
    exposedPaths: exposed,
  });

  return {
    module: "security",
    score: scoreFromIssues(issues),
    risk: riskFromIssues(issues),
    data: { isHttps, cert, headers: headersObj, exposedPaths: exposed },
    issues,
    durationMs: Date.now() - t0,
  };
}
