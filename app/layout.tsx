import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "DeployReady — AI Security Auditor for Vibe-Coded Websites",
    template: "%s | DeployReady",
  },
  description:
    "Detect exposed API keys, leaked secrets, public .env files, source maps, and AI-generated security flaws. Built for sites built with ChatGPT, Cursor, Claude, Lovable, Bolt, Replit, and V0.",
  keywords: [
    "AI security auditor",
    "website security scanner",
    "deployment readiness",
    "secrets scanner",
    "API key leak detector",
    "Lighthouse audit",
    "WCAG accessibility",
    "CSP scanner",
    "Next.js security",
    "Vercel preview leaks",
    "Supabase Firebase exposure",
    "vibe coding security",
    "AI generated code audit",
    "production deployment scanner",
    "free website audit",
  ],
  authors: [{ name: "DeployReady" }],
  creator: "DeployReady",
  publisher: "DeployReady",
  metadataBase: new URL("https://deployready.in"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "DeployReady — AI Security Auditor for Vibe-Coded Websites",
    description:
      "Detect leaked API keys, public .env files, source maps, and AI-generated security flaws in production deployments. Instant scan, no login.",
    url: "https://deployready.in",
    siteName: "DeployReady",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/logo.png",
        width: 1024,
        height: 1024,
        alt: "DeployReady — AI Security Auditor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeployReady — AI Security Auditor",
    description:
      "Catch leaked secrets, exposed env vars, and AI-generated security flaws before they reach production.",
    images: ["/logo.png"],
  },
  category: "technology",
  applicationName: "DeployReady",
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0a",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DeployReady",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  description:
    "AI security auditor that detects leaked API keys, exposed .env files, source maps, CSP weaknesses, and AI-generated security flaws in production websites.",
  url: "https://deployready.in",
  image: "https://deployready.in/logo.png",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  creator: { "@type": "Organization", name: "DeployReady" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans bg-background text-on-background">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
