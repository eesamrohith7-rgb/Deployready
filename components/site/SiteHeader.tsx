"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/report", label: "History" },
  { href: "/manual-checks", label: "Manual Checks" },
  { href: "/files", label: "Files" },
];

export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="bg-background border-b border-outline-variant sticky top-0 z-50 w-full">
      <div className="flex justify-between items-center w-full px-4 md:px-8 h-16 max-w-container-max mx-auto">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-mono text-code-lg font-bold text-primary tracking-tighter"
          >
            DeployReady
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "font-mono text-code-md transition-colors duration-200 " +
                  (isActive(n.href)
                    ? "text-primary border-b-2 border-primary pb-1"
                    : "text-on-surface-variant hover:text-primary-container")
                }
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-3 text-on-surface-variant mr-2">
            <Link
              href="/"
              title="Scanner"
              className="hover:text-primary-container transition-colors"
            >
              <span className="material-symbols-outlined">terminal</span>
            </Link>
            <Link
              href="/files"
              title="Settings"
              className="hover:text-primary-container transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
            </Link>
          </div>
          <Link
            href="/"
            className="bg-primary-container text-on-primary-container font-mono text-label-caps font-bold px-4 py-2 rounded uppercase hover:shadow-[0_0_15px_rgba(243,128,32,0.5)] transition-shadow duration-200 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Scan
          </Link>
        </div>
      </div>
    </header>
  );
}
