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
await page.goto(process.env.APP_URL || "http://localhost:3000");
await page
  .getByRole("heading", { name: "Bienvenue sur OASIS LOGISTICS" })
  .waitFor();
async function checkFormContrast() {
  const ratios = await page.evaluate(() => {
    const luminance = (color) => {
      const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const ratio = (a, b) => {
      const x = luminance(a),
        y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const input = document.querySelector(".login-form input");
    const panel = getComputedStyle(document.querySelector(".login-form-panel"));
    return [
      ratio(
        getComputedStyle(input).color,
        getComputedStyle(input).backgroundColor,
      ),
      ratio(
        getComputedStyle(document.querySelector(".login-form form > label"))
          .color,
        panel.backgroundColor,
      ),
    ];
  });
  assert.ok(
    ratios.every((r) => r >= 4.5),
    "Form text contrast must reach 4.5:1",
  );
}
await checkFormContrast();
const motionButton = page.getByRole("button", {
  name: "Mettre l’animation en pause",
});
await motionButton.click();
assert.equal(
  await page.locator(".login-visual--showcase.is-moving").count(),
  0,
);
await page.getByRole("button", { name: "Reprendre l’animation" }).click();
assert.equal(
  await page.locator(".login-visual--showcase.is-moving").count(),
  1,
);
assert.equal(
  await page
    .getByLabel("Adresse e-mail")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
  true,
);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.getByText("Mouvements réduits", { exact: true }).waitFor();
assert.equal(
  await page.locator(".login-visual--showcase.is-moving").count(),
  0,
);
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.screenshot({
  path: join(tmpdir(), "gestion-login-desktop.png"),
  fullPage: true,
  animations: "disabled",
});
assert.equal(
  await page
    .getByRole("button", { name: "Créer un compte", exact: true })
    .count(),
  0,
);
await page
  .getByText("Pour obtenir un accès, contactez votre administrateur.")
  .waitFor();
await page.getByRole("button", { name: "Changer le thème" }).click();
assert.equal(
  await page.evaluate(() => document.documentElement.dataset.theme),
  "dark",
);
await checkFormContrast();
await page.getByRole("button", { name: "Changer le thème" }).click();
await page.setViewportSize({ width: 390, height: 844 });

await page
  .getByRole("heading", { name: "Bienvenue sur OASIS LOGISTICS" })
  .waitFor();
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
assert.equal(await page.locator(".loading-screen .realistic-wheel").count(), 5);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: real login screen, private access notice, theme, mobile, dashboard and loading animation components. No authenticated workflow was simulated.",
);
