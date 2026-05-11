import { test, expect } from "@playwright/test";

// E2E happy-path: open the WebAudit Pro landing, submit a URL, watch scan progress,
// then verify the report page renders charts and module rows.
//
// Requirements:
// - Web (next dev/start), Postgres, Redis, and the worker must all be running.
// - E2E_BASE_URL defaults to http://localhost:3000.
// - Set E2E=1 to actually run, otherwise the test is skipped so CI without infra still passes.

test.skip(process.env.E2E !== "1", "Set E2E=1 with infra running to enable this end-to-end test");

test("landing → scan → report", async ({ page }) => {
  const target = process.env.E2E_TARGET_URL || "https://example.com";

  await page.goto("/webaudit");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const input = page.getByPlaceholder("https://example.com");
  await input.fill(target);
  await page.getByRole("button", { name: /Run Full Audit/i }).click();

  // We should land on /scan/<uuid>
  await page.waitForURL(/\/scan\/[0-9a-fA-F-]{36}/, { timeout: 20_000 });
  await expect(page.getByText("Diagnostic Log")).toBeVisible();

  // Wait for navigation to the report page (worker writes scan.completed → page auto-redirects)
  await page.waitForURL(/\/report\/[0-9a-fA-F-]{36}/, { timeout: 5 * 60_000 });

  // Report page must show the overall score block
  await expect(page.getByText("Overall")).toBeVisible();
  // and module rows from the table
  await expect(page.getByText("performance")).toBeVisible();
  await expect(page.getByText("security")).toBeVisible();
});
