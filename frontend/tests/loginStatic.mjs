import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const browser = await launchBrowser();
const origin = process.env.APP_URL || "http://localhost:3000";
try {
  for (const width of [1440, 820, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const requests = [];
    const errors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin);
    await page
      .getByRole("heading", { name: "Bienvenue sur Gestion" })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, "/login");
    // Le fond fourni est servi par la feuille de style (::before) et se charge.
    const background = await page.evaluate(() => {
      const style = getComputedStyle(
        document.querySelector(".otl-page"),
        "::before",
      );
      const match = style.backgroundImage.match(/url\("?([^")]+)"?\)/);
      return match ? match[1] : "";
    });
    assert.ok(
      background.includes("login-bg"),
      `The supplied background is used at ${width}px`,
    );
    const naturalWidth = await page.evaluate(async (src) => {
      const image = new Image();
      return new Promise((resolve) => {
        image.onload = () => resolve(image.naturalWidth);
        image.onerror = () => resolve(0);
        image.src = src;
      });
    }, background);
    assert.ok(naturalWidth > 0, `The background image loads at ${width}px`);
    assert.equal(await page.locator(".otl-page canvas").count(), 0);
    assert.equal(
      requests.some(
        (url) => url.includes("/models/truck.glb") || url.includes("/login3d/"),
      ),
      false,
      "No 3D assets requested on the login page",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `No horizontal overflow at ${width}px`,
    );
    // Le formulaire réel reste utilisable à toutes les largeurs.
    await page.getByLabel("Adresse e-mail").fill("static@example.invalid");
    await page.getByLabel("Mot de passe", { exact: true }).fill("test-only");
    assert.equal(
      await page
        .getByRole("button", { name: "Se connecter", exact: true })
        .isEnabled(),
      true,
    );
    await page.screenshot({
      path: join(tmpdir(), `otl-static-${width}.png`),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await page.close();
  }

  // Un écran court doit pouvoir faire défiler la carte et le pied de page.
  const short = await browser.newPage({ viewport: { width: 360, height: 420 } });
  await short.goto(origin);
  await short
    .getByRole("heading", { name: "Bienvenue sur Gestion" })
    .waitFor();
  const scrollable = await short.evaluate(() => {
    const root = document.documentElement;
    const page = document.querySelector(".otl-page");
    return (
      root.scrollHeight > innerHeight || page.scrollHeight > page.clientHeight
    );
  });
  assert.equal(scrollable, true, "The login scrolls on a short screen");
  await short.getByLabel("Adresse e-mail").scrollIntoViewIfNeeded();
  await short.getByLabel("Adresse e-mail").fill("short@example.invalid");
  await short.close();

  // Une image manquante ne doit jamais bloquer le formulaire.
  const fallback = await browser.newPage({
    viewport: { width: 1440, height: 950 },
  });
  // Ne couper que le média : l’URL ?import sert de module JS au composant.
  await fallback.route(/\/login-bg\.jpg$/, (route) => route.abort());
  await fallback.goto(origin);
  await fallback
    .getByRole("heading", { name: "Bienvenue sur Gestion" })
    .waitFor();
  await fallback.getByLabel("Adresse e-mail").fill("fallback@example.invalid");
  await fallback
    .getByLabel("Mot de passe", { exact: true })
    .fill("fallback-only");
  assert.equal(
    await fallback
      .getByRole("button", { name: "Se connecter", exact: true })
      .isEnabled(),
    true,
  );
  await fallback.close();

  console.log(
    "PASS: provided LoginOTL page, supplied background, real form, responsive 1440/820/360, short-screen scrolling and missing-background fallback. No real login tested.",
  );
} finally {
  await browser.close();
}
