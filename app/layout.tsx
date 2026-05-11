import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeployReady — Analyze Deployments with Terminal Precision",
  description:
    "Execute deep security checks and performance audits instantly. SSL, DNS, headers, ports, WAF, email auth, carbon footprint and more. No login.",
  metadataBase: new URL("https://deployready.in"),
  openGraph: {
    title: "DeployReady",
    description:
      "Analyze deployments with terminal precision. Free URL & project analyzer. No login.",
    url: "https://deployready.in",
    siteName: "DeployReady",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "DeployReady" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="font-sans bg-background text-on-background">{children}</body>
    </html>
  );
}
