export default function SiteFooter() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant w-full mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center w-full py-8 px-4 md:px-8 gap-4 max-w-container-max mx-auto">
        <div className="font-mono text-code-md text-on-surface-variant">
          © {new Date().getFullYear()} DeployReady. Deployed on deployready.in
        </div>
        <nav className="flex gap-6 items-center flex-wrap justify-center">
          {[
            { href: "https://status.deployready.in", label: "Status" },
            { href: "https://deployready.in/api-docs", label: "API Docs" },
            { href: "https://deployready.in/privacy", label: "Privacy" },
            { href: "https://deployready.in/terms", label: "Terms" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-mono text-label-caps font-bold text-on-surface-variant hover:text-primary underline decoration-primary/30 underline-offset-4 transition-opacity hover:opacity-80"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
