import type { ModuleResult, ModuleIssue } from "../types";
import { getBrowser } from "./browser";

// Heuristic, generic interaction tests:
// - Buttons / links remain clickable
// - Forms have a submit button or input
// - Search input present?
// - File upload?
export async function runFunctional(url: string): Promise<ModuleResult> {
  const t0 = Date.now();
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const issues: ModuleIssue[] = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const survey = await page.evaluate(() => {
      const all = (sel: string) => Array.from(document.querySelectorAll(sel));
      const buttons = all("button, [role='button'], a.button, .btn, input[type='button'], input[type='submit']");
      const forms = all("form");
      const search = !!document.querySelector("input[type='search'], input[name*='q' i], input[placeholder*='search' i]");
      const uploads = all("input[type='file']");
      const loginHint = !!document.querySelector("input[type='password']");
      const checkoutHint = !!document.body.innerText.match(/cart|checkout|add to bag/i);
      const externalLinks = all("a[href^='http']").map((a) => (a as HTMLAnchorElement).href);
      const internalLinks = all("a[href^='/']").length;
      return {
        buttons: buttons.length,
        forms: forms.length,
        search,
        uploads: uploads.length,
        loginHint,
        checkoutHint,
        externalLinks: externalLinks.length,
        internalLinks,
      };
    });

    // Click-feasibility: try first form's submit (without submitting) and first link's hover
    let formSubmitOk: boolean | null = null;
    const firstForm = await page.$("form");
    if (firstForm) {
      const submit = await firstForm.$("button[type='submit'], input[type='submit'], button:not([type])");
      formSubmitOk = !!submit;
      if (!formSubmitOk) issues.push({ id: "func-form-submit", title: "Form lacks a submit button", severity: "warning" });
    }

    if (!survey.buttons) issues.push({ id: "func-no-buttons", title: "No interactive buttons detected", severity: "info" });
    if (survey.loginHint && !survey.forms) issues.push({ id: "func-login-noform", title: "Login field outside <form>", severity: "warning" });

    const score = Math.max(0, 100 - issues.length * 10);
    return {
      module: "functional",
      score,
      data: { ...survey, formSubmitOk },
      issues,
      durationMs: Date.now() - t0,
    };
  } finally {
    await ctx.close();
  }
}
