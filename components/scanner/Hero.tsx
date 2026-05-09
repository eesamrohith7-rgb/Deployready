"use client";
import { useEffect, useRef } from "react";

export default function Hero({
  url,
  setUrl,
  onSubmit,
  loading,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (target?: string) => void;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-4 md:px-8 w-full max-w-container-max mx-auto py-16 md:py-24 gap-16">
      <section className="flex flex-col items-center text-center w-full max-w-4xl gap-8">
        <h1 className="font-sans text-headline-xl text-on-surface max-w-3xl">
          Analyze Deployments with{" "}
          <span className="text-primary-container">Terminal Precision.</span>
        </h1>
        <p className="font-sans text-body-lg text-on-surface-variant max-w-2xl">
          Execute deep security checks and performance audits instantly. No setup
          required. Enter a target and initialize the scan sequence.
        </p>

        <form
          className="w-full flex flex-col items-center gap-6 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="w-full flex items-center bg-surface-container-lowest border border-outline-variant p-4 rounded-DEFAULT shadow-[0_0_10px_rgba(86,67,54,0.2)] focus-within:border-primary-container focus-within:shadow-[0_0_20px_rgba(243,128,32,0.15)] transition-all duration-300">
            <span className="font-mono text-code-lg text-primary mr-3">&gt;</span>
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to scan..."
              className="flex-grow bg-transparent border-none outline-none p-0 font-mono text-code-md text-on-surface placeholder:text-on-surface-variant/50 caret-primary"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="w-2 h-5 bg-primary animate-blink ml-1" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-container text-on-primary-container font-mono text-label-caps font-bold uppercase tracking-wider px-8 py-4 rounded-DEFAULT hover:shadow-[0_0_25px_rgba(243,128,32,0.6)] transition-all duration-200 flex items-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">radar</span>
            {loading ? "Scanning…" : "Instant Scan"}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 text-on-surface-variant text-xs font-mono">
            <span className="opacity-60">Try:</span>
            {["https://example.com", "https://github.com", "https://news.ycombinator.com"].map(
              (u) => (
                <button
                  type="button"
                  key={u}
                  onClick={() => {
                    setUrl(u);
                    onSubmit(u);
                  }}
                  className="text-primary hover:text-primary-container hover:underline decoration-primary-container/40"
                >
                  {u}
                </button>
              ),
            )}
          </div>
        </form>
      </section>

      <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <FeatureCard
          label="Access Protocol"
          icon="lock_open"
          title="No Login Required"
          body="Bypass authentication friction. Initiate robust security audits immediately from the command line interface above. Your sessions remain anonymous and ephemeral."
        />
        <FeatureCard
          label="Scan Depth"
          icon="shield_with_heart"
          title="Comprehensive Security Checks"
          body="Execute 30+ vulnerability assessments simultaneously. From SSL certificate validation to deep header inspection, DNS, ports, email auth and carbon footprint."
        />
      </section>
    </main>
  );
}

function FeatureCard({
  label,
  icon,
  title,
  body,
}: {
  label: string;
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bento p-8 flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-surface-container-highest group-hover:bg-primary-container transition-colors duration-300" />
      <div className="flex items-center justify-between w-full">
        <span className="font-mono text-label-caps font-bold uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div>
        <h3 className="font-sans text-headline-md text-on-surface mb-2">{title}</h3>
        <p className="font-sans text-body-md text-on-surface-variant">{body}</p>
      </div>
    </div>
  );
}
