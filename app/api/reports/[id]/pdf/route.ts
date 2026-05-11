import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const u = new URL(req.url);
  const origin = `${u.protocol}//${u.host}`;
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${origin}/report/${params.id}?print=1`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" } });
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=webaudit-${params.id}.pdf`,
      },
    });
  } finally {
    await browser.close().catch(() => {});
  }
}
