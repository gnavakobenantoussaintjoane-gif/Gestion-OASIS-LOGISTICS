import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
if (process.platform === "linux") {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve("@sparticuz/chromium"));
  const temp = mkdtempSync(join(tmpdir(), "gestion-browser-"));
  const tar = join(temp, "libraries.tar");
  writeFileSync(
    tar,
    brotliDecompressSync(readFileSync(join(root, "../bin/al2023.tar.br"))),
  );
  execFileSync("tar", ["xf", tar, "-C", temp]);
  process.env.LD_LIBRARY_PATH = `${join(temp, "lib")}:${process.env.LD_LIBRARY_PATH || ""}`;
}
const browser = await chromium.launch({
  executablePath: await serverChromium.executablePath(),
  args: serverChromium.args,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://localhost:5173");
await page.getByRole("heading", { name: "Bienvenue sur GESTION" }).waitFor();
await page.screenshot({
  path: join(tmpdir(), "gestion-login-desktop.png"),
  fullPage: true,
  animations: "disabled",
});
await page
  .getByRole("button", { name: "Créer un compte", exact: true })
  .click();
await page.getByRole("heading", { name: "Créez votre compte." }).waitFor();
await page.getByLabel("Adresse e-mail").fill("not-an-email");
await page.getByLabel("Mot de passe", { exact: true }).fill("short");
await page
  .getByRole("button", { name: "Créer mon compte", exact: true })
  .click();
assert.equal(
  await page.getByRole("heading", { name: "Créez votre compte." }).count(),
  1,
);
await page.getByRole("button", { name: "Changer le thème" }).click();
assert.equal(
  await page.evaluate(() => document.documentElement.dataset.theme),
  "dark",
);
await page.getByRole("button", { name: "Changer le thème" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
await page.getByRole("heading", { name: "Bienvenue sur GESTION" }).waitFor();
await page.screenshot({
  path: join(tmpdir(), "gestion-login-mobile.png"),
  fullPage: true,
  animations: "disabled",
});
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
assert.equal(await page.locator(".login-visual").isVisible(), true);
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
assert.equal(await page.locator(".loading-screen .flat-wheel").count(), 4);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: real login screen, registration validation, theme, mobile, dashboard and loading animation components. No authenticated workflow was simulated.",
);
