import { AlertTriangle } from "lucide-react";

type Card = {
  emoji: string;
  title: string;
  what: string;
  why: string;
  tool: string;
};

const CARDS: Card[] = [
  {
    emoji: "🌐",
    title: "Cross-browser rendering",
    what: "Confirm the site renders correctly in Chrome, Safari, Firefox, Edge, and Brave.",
    why: "Each engine (Blink / WebKit / Gecko) has its own quirks; HTML alone can't predict layout breakage.",
    tool: "BrowserStack, LambdaTest, or run each browser locally on real hardware.",
  },
  {
    emoji: "📱",
    title: "Real-device responsive screenshots",
    what: "Verify layout, fonts, and touch targets on real phones and tablets.",
    why: "DevTools emulation misses real GPU, font rendering, notches, and gesture behavior.",
    tool: "BrowserStack App Live, Sauce Labs Real Device Cloud, or your own device lab.",
  },
  {
    emoji: "⚡",
    title: "Lighthouse FPS / Memory / CPU / runtime performance",
    what: "Measure scroll FPS, JS heap, CPU pressure, and Core Web Vitals on a real run.",
    why: "Runtime metrics need an actual browser executing the page over time.",
    tool: "Chrome DevTools Performance tab, Lighthouse CI, WebPageTest.",
  },
  {
    emoji: "🔥",
    title: "Load testing (100 / 10k / peak users)",
    what: "Simulate concurrent users hitting your site or API to find the breaking point.",
    why: "Requires sustained traffic from many machines — a single fetch tells you nothing about scale.",
    tool: "k6, Apache JMeter, Artillery, Locust.",
  },
  {
    emoji: "💥",
    title: "Stress / Crash / Recovery testing",
    what: "Push CPU, memory, and connections beyond limits and observe how the system recovers.",
    why: "Static analysis can't predict OOM kills, restart loops, or graceful-shutdown bugs.",
    tool: "k6 stress profile, chaos-mesh, Gremlin, or scripted spike tests.",
  },
  {
    emoji: "🔐",
    title: "Live SQLi / XSS / CSRF probing",
    what: "Actively probe forms, query strings, and cookies for injection and CSRF flaws.",
    why: "Real attacks require interacting with auth state and form submissions — not just reading HTML.",
    tool: "OWASP ZAP, Burp Suite, sqlmap, Nuclei.",
  },
  {
    emoji: "🗄️",
    title: "Database CRUD / consistency / backup",
    what: "Verify create / read / update / delete flows, transactional integrity, and backup restore.",
    why: "We can't reach your database from a static check; only real queries prove correctness.",
    tool: "Your DB CLI, integration tests (Vitest/Jest + testcontainers), backup-restore drills.",
  },
  {
    emoji: "♿",
    title: "Real screen-reader audits",
    what: "Navigate the site with a screen reader to confirm announcements and focus order.",
    why: "Static markup checks miss semantics, live regions, focus traps, and dynamic announcements.",
    tool: "NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android), axe DevTools.",
  },
  {
    emoji: "📶",
    title: "Throttled-network testing (2G / 3G / offline)",
    what: "Verify the app degrades gracefully on slow or offline connections.",
    why: "Server-side fetches always run on fast broadband — they can't replicate a 400 ms-RTT 2G link.",
    tool: "Chrome DevTools Network throttling, Lighthouse Slow 4G preset, real SIM testing.",
  },
];

export default function ManualChecks(_props?: { items?: string[] }) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 grid place-items-center text-yellow-300 shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Requires Manual Testing</h3>
          <p className="text-sm text-on-surface-variant">
            These checks require real browsers, devices, or sustained traffic —
            <strong className="text-white"> cannot be automated</strong> from a
            single fetch.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {CARDS.map((c) => (
          <article
            key={c.title}
            className="border border-border rounded-xl p-4 bg-black/30 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none" aria-hidden>
                {c.emoji}
              </span>
              <h4 className="font-semibold">{c.title}</h4>
            </div>
            <div className="text-xs">
              <div className="text-on-surface-variant uppercase tracking-wider mt-1">What</div>
              <div className="text-white/90">{c.what}</div>
            </div>
            <div className="text-xs">
              <div className="text-on-surface-variant uppercase tracking-wider mt-1">
                Why it can't be automated
              </div>
              <div className="text-white/80">{c.why}</div>
            </div>
            <div className="text-xs">
              <div className="text-on-surface-variant uppercase tracking-wider mt-1">
                Recommended tool
              </div>
              <div className="text-accent">{c.tool}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export const MANUAL_CHECK_CARDS = CARDS;
