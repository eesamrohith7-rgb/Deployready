import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full border-b border-border/80">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 grid place-items-center text-bg">
            <ShieldCheck size={18} />
          </div>
          <span className="font-bold text-lg">
            Deploy<span className="gradient-text">Ready</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-on-surface-variant">
          <a href="#how" className="hover:text-white">How it works</a>
          <a
            href="https://deployready.in"
            className="hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            deployready.in
          </a>
        </nav>
      </div>
    </header>
  );
}
