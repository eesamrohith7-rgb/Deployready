"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Upload, Loader2, FileArchive, FileText } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import Summary from "./Summary";
import IssueList from "./IssueList";
import CategoryBreakdown from "./CategoryBreakdown";
import ManualChecks from "./ManualChecks";
import DeepTestingRoadmap from "./DeepTestingRoadmap";
import SiteIntelligence from "./SiteIntelligence";

type Tab = "url" | "file";

export default function Checker() {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const runUrl = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/check-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to check URL");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/check-files", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to analyze archive");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openReport = () => {
    if (!result) return;
    try {
      sessionStorage.setItem("deployready:result", JSON.stringify(result));
    } catch {}
    router.push("/report");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-2 inline-flex gap-1 self-start">
        <button className={`tab ${tab === "url" ? "active" : ""}`} onClick={() => setTab("url")}>
          <span className="inline-flex items-center gap-2">
            <Globe size={16} /> Check URL
          </span>
        </button>
        <button className={`tab ${tab === "file" ? "active" : ""}`} onClick={() => setTab("file")}>
          <span className="inline-flex items-center gap-2">
            <FileArchive size={16} /> Analyze Files (.zip)
          </span>
        </button>
      </div>

      {tab === "url" ? (
        <div className="card p-5">
          <label className="text-sm text-on-surface-variant">Website URL</label>
          <div className="flex gap-2 mt-2 flex-col sm:flex-row">
            <input
              className="input"
              placeholder="https://yoursite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url && runUrl()}
            />
            <button className="btn btn-primary" onClick={runUrl} disabled={!url || loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              {loading ? "Checking..." : "Check Site"}
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-3">
            Checks: online status, SSL certificate, load speed, meta tags, Open Graph, mobile viewport.
          </p>
        </div>
      ) : (
        <div className="card p-5">
          <label className="text-sm text-on-surface-variant">Upload project archive (.zip)</label>
          <div
            className="mt-2 border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/60 transition"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f && f.name.endsWith(".zip")) setFile(f);
            }}
          >
            <Upload className="mx-auto text-on-surface-variant" />
            <div className="mt-2 text-sm">
              {file ? (
                <span className="text-white">
                  <FileText size={14} className="inline mr-1" />
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </span>
              ) : (
                <>
                  <span className="text-white">Click to upload</span>{" "}
                  <span className="text-on-surface-variant">or drag and drop a .zip of your project</span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="mt-3">
            <button className="btn btn-primary" onClick={runFile} disabled={!file || loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileArchive size={16} />}
              {loading ? "Analyzing..." : "Analyze Project"}
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-3">
            Scans for missing files (package.json, lockfile, .env.example, README, etc.), broken
            local imports, and imported packages not listed in dependencies.
          </p>
        </div>
      )}

      {error && (
        <div className="card p-4 border-red-500/40 text-red-300">{error}</div>
      )}

      {result && (
        <div className="flex flex-col gap-5">
          <Summary result={result} />
          {result.kind === "url" && <SiteIntelligence intel={result.intel} />}
          <CategoryBreakdown issues={result.issues} />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Issues ({result.issues.length})
            </h3>
            <button className="btn btn-ghost" onClick={openReport}>
              <FileText size={16} /> View full report
            </button>
          </div>
          <IssueList issues={result.issues} />
          <ManualChecks items={result.manualChecks} />
          <DeepTestingRoadmap />
        </div>
      )}
    </div>
  );
}
