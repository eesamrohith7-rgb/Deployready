"use client";
import { MANUAL_CHECK_CARDS } from "@/components/ManualChecks";

const AUDIT_TAGS: Record<string, { tag: string; icon: string; status: "warn" | "ok" | "info" }> = {
  "Cross-browser rendering": { tag: "Audit::Render", icon: "visibility", status: "warn" },
  "Real-device responsive screenshots": { tag: "Audit::Devices", icon: "devices", status: "info" },
  "Lighthouse FPS / Memory / CPU / runtime performance": { tag: "Audit::Perf", icon: "speed", status: "info" },
  "Load testing (100 / 10k / peak users)": { tag: "Audit::Load", icon: "trending_up", status: "info" },
  "Stress / Crash / Recovery testing": { tag: "Audit::Chaos", icon: "bolt", status: "warn" },
  "Live SQLi / XSS / CSRF probing": { tag: "Audit::Sec", icon: "security", status: "warn" },
  "Database CRUD / consistency / backup": { tag: "Audit::Data", icon: "database", status: "info" },
  "Real screen-reader audits": { tag: "Audit::A11y", icon: "hearing", status: "info" },
  "Throttled-network testing (2G / 3G / offline)": { tag: "Audit::Net", icon: "wifi_tethering", status: "info" },
};

const STATUS_COLOR: Record<string, string> = {
  warn: "#ffb4ab",
  ok: "#4ade80",
  info: "#f38020",
};

export default function ManualChecksPage() {
  return (
    <main className="w-full max-w-container-max mx-auto px-4 md:px-8 py-12 flex-grow flex flex-col gap-8">
      {/* Terminal prompt header */}
      <section className="border-l-4 border-primary-container pl-6 py-2 mb-2">
        <h1 className="font-sans text-headline-xl text-on-surface mb-3 tracking-tight">
          Manual_Checks
        </h1>
        <div className="font-mono text-code-md text-on-surface-variant flex items-center gap-3">
          <span className="text-primary-container font-bold">~ $</span>
          <span>Initiating human-in-the-loop verification protocols...</span>
          <span className="inline-block w-2 h-4 bg-primary animate-blink ml-1" />
        </div>
      </section>

      {/* Bento grid of audit cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {MANUAL_CHECK_CARDS.map((c) => {
          const meta = AUDIT_TAGS[c.title] || { tag: "Audit", icon: "task", status: "info" as const };
          return (
            <article
              key={c.title}
              className="md:col-span-4 bento p-6 flex flex-col hover:border-primary-container/40 transition-all duration-300"
            >
              <header className="flex justify-between items-start mb-6">
                <span className="font-mono text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
                  {meta.tag}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLOR[meta.status] }}
                  title={meta.status === "warn" ? "Requires Action" : "Pending"}
                />
              </header>
              <h2 className="font-sans text-headline-md text-on-surface mb-4">{c.title}</h2>

              <div className="mb-4">
                <h3 className="font-mono text-code-md text-primary mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                  Target
                </h3>
                <p className="font-sans text-body-md text-on-surface-variant">{c.what}</p>
              </div>

              <div className="mb-6 flex-grow">
                <h3 className="font-mono text-code-md text-primary mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Context
                </h3>
                <p className="font-sans text-body-md text-tertiary-container">{c.why}</p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container p-4 rounded-DEFAULT mt-auto flex flex-col gap-2 relative overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 bg-primary-container/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="font-mono text-label-caps font-bold uppercase tracking-widest text-on-surface-variant relative z-10">
                  Recommended Tool
                </span>
                <div className="flex items-center justify-between relative z-10">
                  <span className="font-mono text-code-md text-on-surface group-hover:text-primary transition-colors">
                    {c.tool}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </article>
          );
        })}

        {/* Bottom syslog box */}
        <div className="md:col-span-12 bg-[#050505] border border-[#1f1f1f] rounded-DEFAULT p-6 mt-2">
          <header className="flex items-center gap-2 border-b border-[#1f1f1f] pb-4 mb-4">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">terminal</span>
            <span className="font-mono text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              syslog // manual_audit_runner.sh
            </span>
          </header>
          <div className="font-mono text-code-md text-tertiary opacity-80 space-y-2">
            <p>
              <span className="text-secondary-container">[14:02:45]</span>{" "}
              <span className="text-primary-container">WARN:</span> Browser Rendering audit marked as{" "}
              <span className="text-error">REQUIRES_ACTION</span>.
            </p>
            <p>
              <span className="text-secondary-container">[14:02:46]</span>{" "}
              <span className="text-primary">INFO:</span> Load Experience audit awaiting manual sign-off.
            </p>
            <p>
              <span className="text-secondary-container">[14:02:46]</span>{" "}
              <span className="text-primary">INFO:</span> A11y Screen Reader session initialized by user{" "}
              <span className="text-on-surface">deployer</span>.
            </p>
            <p className="text-on-surface-variant mt-4">
              Waiting for auditor input
              <span className="animate-blink">_</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
