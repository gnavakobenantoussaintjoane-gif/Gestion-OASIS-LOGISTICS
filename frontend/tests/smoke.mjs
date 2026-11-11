import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchBrowser } from "./browser.mjs";
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://localhost:3000");
await page
  .getByRole("heading", { name: "Bienvenue sur OASIS LOGISTICS" })
  .waitFor();
async function checkFormContrast() {
  const ratios = await page.evaluate(() => {
    const lum = (color) => {
      const c = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    };
    const ratio = (a, b) => {
      const x = lum(a),
        y = lum(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const input = document.querySelector(".gestion-auth input");
    const panel = getComputedStyle(
      document.querySelector(".gestion-auth__panel"),
    );
    return [
      ratio(
        getComputedStyle(input).color,
        getComputedStyle(input).backgroundColor,
      ),
      ratio(
        getComputedStyle(document.querySelector(".gestion-auth label")).color,
        panel.backgroundColor,
      ),
    ];
  });
  assert.ok(
    ratios.every((r) => r >= 4.5),
    "Readable form contrast",
  );
}
await checkFormContrast();
assert.equal(await page.locator(".gestion-auth .flat-truck").count(), 0);
assert.equal(
  await page.locator(".gestion-auth .truck-illustration").count(),
  0,
);
await page.waitForFunction(() =>
  ["ready", "static"].includes(
    document.querySelector(".gestion-auth__three")?.dataset.sceneState,
  ),
);
assert.equal(
  await page.locator(".gestion-auth__three").evaluate((el) => {
    const a = el.getBoundingClientRect(),
      b = el.closest("main").getBoundingClientRect();
    return Math.abs(a.height - b.height) < 2 && Math.abs(a.width - b.width) < 2;
  }),
  true,
);
await page.screenshot({
  path: join(tmpdir(), "gestion-login-desktop.png"),
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
await page.getByRole("alert").waitFor();
await page.getByRole("button", { name: "Téléphone", exact: true }).click();
await page.getByLabel("Numéro de téléphone").fill("0700000000");
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
assert.ok((await page.getByRole("alert").textContent()).includes("E.164"));
await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
await page.getByRole("heading", { name: "Mot de passe oublié ?" }).waitFor();
await page.getByRole("button", { name: "Retour à la connexion" }).click();
await page.emulateMedia({ reducedMotion: "reduce" });
await page.waitForFunction(
  () =>
    !document
      .querySelector(".gestion-auth")
      .classList.contains("gestion-auth--moving"),
);
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
await checkFormContrast(); // The login stays light without changing the stored theme preference.
await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
for (const width of [768, 390, 320]) {
  await page.setViewportSize({ width, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(
    await page
      .getByLabel("Adresse e-mail")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
    true,
  );
}
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForFunction(
  () => document.querySelectorAll("[data-sonner-toast]").length === 0,
);
await page.screenshot({
  path: join(tmpdir(), "gestion-login-mobile.png"),
  fullPage: true,
  animations: "disabled",
});
await page.goto(
  (process.env.APP_URL || "http://localhost:3000") +
    "/auth/callback?error=access_denied",
);
await page.getByRole("alert").waitFor();
await page.getByRole("button", { name: "Retour à la connexion" }).click();
await page
  .getByRole("heading", { name: "Bienvenue sur OASIS LOGISTICS" })
  .waitFor();
// Component-only animation checks. No fabricated session or operational data.
await page.evaluate(async () => {
  const React = await import("/node_modules/.vite/deps/react.js");
  const client = await import("/node_modules/.vite/deps/react-dom_client.js");
  const createRoot = client.createRoot || client.default.createRoot;
  const { default: Hero } =
    await import("/src/components/animations/DashboardTruckAnimation.tsx");
  const host = document.createElement("div");
  host.id = "animation-test";
  document.body.append(host);
  createRoot(host).render(
    (React.createElement || React.default.createElement)(Hero),
  );
});
await page.locator("#animation-test .fleet-hero").waitFor();
assert.equal(await page.locator("#animation-test .flat-truck").count(), 1);
await page.evaluate(async () => {
  const React = await import("/node_modules/.vite/deps/react.js");
  const client = await import("/node_modules/.vite/deps/react-dom_client.js");
  const createRoot = client.createRoot || client.default.createRoot;
  const { default: Loading } =
    await import("/src/components/animations/LoadingTruckAnimation.tsx");
  const host = document.createElement("div");
  host.id = "loading-test";
  document.body.append(host);
  createRoot(host).render(
    (React.createElement || React.default.createElement)(Loading),
  );
});
await page.getByText("Préparation de votre espace de gestion...").waitFor();
assert.equal(await page.locator(".loading-screen .realistic-wheel").count(), 5);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: real login screen, GLB login with fallback, phone validation, recovery form, callback errors, responsive layout, dashboard and loading animation components. No authenticated workflow was simulated.",
);
