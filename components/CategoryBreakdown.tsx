import type { Issue } from "@/lib/types";

export default function CategoryBreakdown({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  const byCat = new Map<string, { critical: number; warning: number; info: number }>();
  for (const i of issues) {
    const c = byCat.get(i.category) || { critical: 0, warning: 0, info: 0 };
    c[i.severity]++;
    byCat.set(i.category, c);
  }
  const rows = Array.from(byCat.entries()).sort((a, b) => {
    const sa = a[1].critical * 100 + a[1].warning * 10 + a[1].info;
    const sb = b[1].critical * 100 + b[1].warning * 10 + b[1].info;
    return sb - sa;
  });
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">By category</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(([cat, c]) => (
          <div key={cat} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
            <span className="text-sm">{cat}</span>
            <span className="flex gap-2 text-xs">
              {c.critical > 0 && <span className="chip critical">{c.critical}</span>}
              {c.warning > 0 && <span className="chip warning">{c.warning}</span>}
              {c.info > 0 && <span className="chip info">{c.info}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
