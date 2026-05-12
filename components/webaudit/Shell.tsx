"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/webaudit", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monitor", label: "Monitor" },
  { href: "/auth", label: "Account" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <header className="border-b border-outline-variant sticky top-0 z-40 bg-background/90 backdrop-blur">
        <div className="max-w-container-max mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/webaudit" className="flex items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
            <img src="/logo.png" alt="WebAudit Pro" className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="font-mono text-code-md sm:text-code-lg font-bold text-primary tracking-tight">
              WebAudit<span className="text-on-surface-variant">Pro</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-5 items-center">
            {NAV.map((n) => {
              const active = n.href === "/webaudit" ? pathname === "/webaudit" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    "font-mono text-code-md transition-colors " +
                    (active ? "text-primary border-b border-primary pb-1" : "text-on-surface-variant hover:text-primary-container")
                  }
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 text-on-surface hover:text-primary transition-colors"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span className="material-symbols-outlined text-[24px]">{open ? "close" : "menu"}</span>
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <nav className="md:hidden border-t border-outline-variant bg-background/95 backdrop-blur">
            <div className="max-w-container-max mx-auto px-4 py-3 flex flex-col gap-2">
              {NAV.map((n) => {
                const active = n.href === "/webaudit" ? pathname === "/webaudit" : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={
                      "font-mono text-code-md py-2 px-2 rounded transition-colors " +
                      (active ? "text-primary bg-primary-container/10" : "text-on-surface-variant hover:text-primary-container")
                    }
                  >
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-outline-variant py-4 sm:py-6 text-center font-mono text-code-sm sm:text-code-md text-on-surface-variant px-4">
        WebAudit Pro · running on your stack
      </footer>
    </div>
  );
}
