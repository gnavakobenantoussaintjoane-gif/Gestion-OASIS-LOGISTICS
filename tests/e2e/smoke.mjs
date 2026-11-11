import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
// Minimal Linux containers may lack NSS. The Chromium package bundles these libraries.
if (process.platform === "linux") {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve("@sparticuz/chromium"));
  const temp = mkdtempSync(join(tmpdir(), "oasis-browser-"));
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://localhost:3000");
await page
  .getByRole("button", { name: "Nouveau voyage", exact: true })
  .waitFor();
await page.waitForFunction(
  () => document.querySelectorAll("tbody tr").length === 5,
);
await page.screenshot({
  path: join(tmpdir(), "oasis-desktop.png"),
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("button", { name: "Nouveau voyage", exact: true }).click();
await page.getByLabel("Camion", { exact: true }).selectOption("t1");
await page.getByLabel("Nombre de voyages").fill("2");
await page.getByLabel("Prix par voyage").fill("50000");
await page.getByLabel("Montant déjà encaissé").fill("20000");
assert.match(await page.locator(".total-preview").innerText(), /100\s*000/);
await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page.reload();
await page.waitForFunction(
  () => document.querySelectorAll("tbody tr").length === 5,
);
assert.equal(
  await page.evaluate(
    () => JSON.parse(localStorage.getItem("oasis-logistics-v1")).trips.length,
  ),
  25,
);
await page
  .getByRole("button", { name: "Voyages & shifts", exact: false })
  .click();
assert.equal(await page.locator("tbody tr").count(), 25);
await page.getByRole("button", { name: "Filtres", exact: true }).click();
await page.getByLabel("Terminal", { exact: true }).selectOption("CIT");
assert.equal(await page.locator("tbody tr").count(), 8);
await page.getByTitle("Réinitialiser les filtres").click();
await page.getByRole("button", { name: "Dépenses", exact: true }).click();
await page.getByRole("button", { name: "Nouvelle dépense" }).click();
await page.getByLabel("Description", { exact: true }).fill("Test carburant");
await page.getByLabel("Montant payé").fill("15000");
await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(await page.locator("tbody tr").count(), 6);
for (const format of ["Tableau Excel (.xlsx)", "Rapport PDF (.pdf)"]) {
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: format, exact: true }).click();
  const download = await downloadPromise;
  assert.equal(await download.failure(), null);
  assert.match(download.suggestedFilename(), /oasis-rapport/);
}
await page.getByRole("button", { name: "Camions", exact: true }).click();
await page
  .getByRole("button", { name: "Ajouter un camion", exact: true })
  .first()
  .click();
await page.getByLabel("Immatriculation").fill("TEST 123 CI");
await page.getByLabel("Chauffeur", { exact: true }).fill("Chauffeur test");
await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(await page.locator(".truck-card").count(), 5);
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Menu", exact: true }).click();
await page.getByRole("button", { name: "Vue d’ensemble", exact: true }).click();
await page.screenshot({
  path: join(tmpdir(), "oasis-mobile.png"),
  fullPage: true,
  animations: "disabled",
});
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "E2E OK: création camion/voyage/dépense, calcul, persistance, filtres, Excel, PDF, mobile, aucune erreur JS.",
);
