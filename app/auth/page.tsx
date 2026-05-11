"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/webaudit/Shell";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, password, name } : { email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setUser(j.user);
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (user) {
    return (
      <Shell>
        <section className="max-w-md mx-auto bento p-6 flex flex-col gap-4">
          <h1 className="font-sans text-headline-md">Signed in</h1>
          <div className="font-mono text-code-md">{user.email}</div>
          <button onClick={logout} className="btn btn-ghost w-fit">Log out</button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="max-w-md mx-auto bento p-6 flex flex-col gap-4">
        <div className="flex gap-2 mb-2">
          <button onClick={() => setMode("login")} className={`tab ${mode === "login" ? "active" : ""}`}>Log in</button>
          <button onClick={() => setMode("signup")} className={`tab ${mode === "signup" ? "active" : ""}`}>Sign up</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input className="input" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} />
          {err && <p className="text-error font-mono text-code-md">{err}</p>}
          <button disabled={busy} className="btn btn-primary">{busy ? "..." : mode === "login" ? "Log in" : "Create account"}</button>
        </form>
      </section>
    </Shell>
  );
}
