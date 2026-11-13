// Recette visuelle isolée : réponses HTTP vides et identité de TEST uniquement.
// Aucun cookie réel, aucune écriture, aucune donnée métier ni connexion Supabase simulée comme réelle.
import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const browser = await launchBrowser();
const origin = process.env.APP_URL || "http://localhost:3000";
const references = Object.fromEntries(
  [
    "trucks",
    "drivers",
    "terminals",
    "container_types",
    "expense_categories",
    "tariff_rules",
    "shift_definitions",
  ].map((key) => [key, []]),
);
const report = {
  trips: [],
  expenses: [],
  trucks: [],
  totals: { revenue: "0", expenses: "0", profit: "0", trips: 0 },
};
let checked = 0;
try {
  for (const role of ["admin", "manager", "operator", "driver"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 950 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() =>
      localStorage.setItem("gestion-animations", "off"),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error(error.message);
    });
    await page.route(
      (url) => url.pathname.startsWith("/api/"),
      async (route) => {
        assert.equal(
          route.request().method(),
          "GET",
          "Read-only rendering test must not write",
        );
        const path = new URL(route.request().url()).pathname;
        let body = [];
        if (path === "/api/auth/session")
          body = {
            user: { id: "test-render-only", email: "render@example.invalid" },
            profile: { full_name: "Test de rendu isolé" },
            company: { id: "test-company", name: "OTL — test de rendu" },
            role,
            isSuperAdmin: role === "admin",
          };
        else if (path === "/api/reference-data") body = references;
        else if (path === "/api/dashboard") body = report;
        else if (
          [
            "trucks",
            "drivers",
            "trips",
            "expenses",
            "tariff_rules",
            "terminals",
            "container_types",
            "expense_categories",
          ].some((key) => path === `/api/${key}`)
        )
          body = { rows: [], total: 0, page: 1, limit: 20 };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      },
    );
    const routes =
      role === "admin" || role === "manager"
        ? [
            "/",
            "/records/trucks",
            "/records/drivers",
            "/records/trips",
            "/records/expenses",
            "/records/tariff_rules",
            "/records/terminals",
            "/records/container_types",
            "/records/expense_categories",
            "/reports",
            "/shifts",
            "/settings",
            "/notifications",
            "/audit",
          ]
        : role === "operator"
          ? [
              "/records/trucks",
              "/records/drivers",
              "/records/trips",
              "/records/tariff_rules",
              "/settings",
              "/notifications",
            ]
          : ["/records/trips", "/settings", "/notifications"];
    for (const path of routes) {
      console.log("Checking", role, path);
      await page.goto(origin + path);
      await page.locator(".app-shell h1").waitFor();
      await page.waitForFunction(
        () => !document.querySelector("main .spinner"),
      );
      assert.equal(await page.locator(".sidebar .otl-logo").count(), 1);
      const expectedHeading = await page.locator(".app-shell h1").textContent();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 950 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `No overflow: ${role} ${path} ${width}`,
        );
        assert.equal(
          await page.locator(".app-shell h1").textContent(),
          expectedHeading,
        );
      }
      if (role === "admin" && path.startsWith("/records/")) {
        await page
          .getByRole("button", { name: /^Ajouter / })
          .first()
          .click();
        await page.getByRole("dialog").waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Form fits mobile: ${path}`,
        );
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "detached" });
      }
      checked++;
    }
    if (role === "operator" || role === "driver") {
      await page.goto(origin + "/reports");
      await page.waitForURL("**/records/trips");
      assert.equal(
        await page.locator('.sidebar a[href="/reports"]').count(),
        0,
      );
    }
    assert.deepEqual(errors, [], role);
    if (role === "admin") {
      await page.goto(origin);
      await page.locator(".stats-grid").waitFor();
      await page.setViewportSize({ width: 1440, height: 950 });
      await page.screenshot({
        path: join(tmpdir(), "otl-dashboard-empty-render-test.png"),
        fullPage: true,
      });
    }
    await context.close();
  }
  console.log(
    `PASS: ${checked} page/role combinations, desktop/mobile, original logo, read-only empty states. ISOLATED rendering test, not a real authenticated Supabase workflow.`,
  );
} finally {
  await browser.close();
}
