export type Severity = "critical" | "warning" | "info";

export interface Issue {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  category: string; // e.g. "SSL", "Meta", "Files", "Imports", "Deps"
  fixPrompt: string;
}

export interface UrlCheckResult {
  kind: "url";
  url: string;
  finalUrl?: string;
  online: boolean;
  statusCode?: number;
  ssl: { valid: boolean; protocol?: string; issuer?: string; validTo?: string; daysRemaining?: number };
  loadTimeMs?: number;
  pageSizeBytes?: number;
  meta: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    canonical?: string;
    favicon?: boolean;
    lang?: string;
    structuredData?: number; // count of JSON-LD blocks
  };
  mobileFriendly: { viewport: boolean; responsiveHints: boolean };
  security: {
    httpsRedirect?: boolean;
    headers: Record<string, string | undefined>; // key headers
    poweredBy?: string;
    exposedEnv?: boolean;
    exposedGit?: boolean;
    sourceMapExposed?: boolean;
  };
  seoFiles: { robots: boolean; sitemap: boolean };
  accessibility: {
    htmlLang: boolean;
    imgsTotal: number;
    imgsMissingAlt: number;
    h1Count: number;
    formsTotal: number;
    inputsMissingLabel: number;
  };
  performance: {
    contentEncoding?: string;
    cacheControl?: string;
    inlineScripts: number;
    externalScripts: number;
    images: number;
    http2?: boolean;
  };
  intel?: SiteIntel;
  issues: Issue[];
  scannedAt: string;
  manualChecks: string[]; // suggested categories to test manually
}

export interface SiteIntel {
  ip?: string;
  geo?: { country?: string; city?: string; region?: string; org?: string; asn?: string; lat?: number; lon?: number; tz?: string };
  redirects: { from: string; status?: number; to?: string }[];
  dns: {
    a: string[];
    aaaa: string[];
    mx: { exchange: string; priority: number }[];
    ns: string[];
    txt: string[];
    caa: string[];
    soa?: { primary: string; admin: string; serial: number };
    dnssec: { ds: boolean; dnskey: boolean };
  };
  email: {
    spf?: string;
    dmarc?: string;
    bimi?: string;
  };
  rdap?: {
    registrar?: string;
    created?: string;
    expires?: string;
    updated?: string;
    nameservers?: string[];
  };
  cookies: { name: string; secure: boolean; httpOnly: boolean; sameSite?: string }[];
  cdnWaf?: string; // detected provider
  securityTxt: boolean;
  linkedPages: { internal: number; external: number };
  carbonGrams?: number;
  ports?: { open: number[]; closed: number[] };
  tlsDetail?: {
    protocol?: string;
    cipher?: string;
    alpn?: string;
    forwardSecrecy?: boolean;
    sessionResumption?: boolean;
    ocspStapling?: boolean;
    keyExchange?: string;
  };
  headers?: Record<string, string>;
  robots?: string;
  hostnames?: string[];
}

export interface FileCheckResult {
  kind: "file";
  archiveName: string;
  fileCount: number;
  detectedStack: string[];
  foundFiles: string[];
  missingFiles: string[];
  brokenImports: { file: string; importPath: string }[];
  missingDeps: string[];
  testing: {
    frameworks: string[]; // jest, vitest, playwright, cypress, mocha, pytest
    hasTestScript: boolean;
    testFileCount: number;
  };
  cicd: { providers: string[]; hasDockerfile: boolean; hasDockerCompose: boolean };
  secrets: { file: string; kind: string }[];
  issues: Issue[];
  scannedAt: string;
  manualChecks: string[];
}

export type AnalysisResult = UrlCheckResult | FileCheckResult;
