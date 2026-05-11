"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/webaudit", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monitor", label: "Monitor" },
  { href: "/auth", label: "Account" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <header className="border-b border-outline-variant sticky top-0 z-40 bg-background/90 backdrop-blur">
        <div className="max-w-container-max mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/webaudit" className="font-mono text-code-lg font-bold text-primary tracking-tight">
            WebAudit<span className="text-on-surface-variant">Pro</span>
          </Link>
          <nav className="flex gap-5 items-center">
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
        </div>
      </header>
      <main className="flex-grow w-full max-w-container-max mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-outline-variant py-6 text-center font-mono text-code-md text-on-surface-variant">
        WebAudit Pro · running on your stack
      </footer>
    </div>
  );
}
