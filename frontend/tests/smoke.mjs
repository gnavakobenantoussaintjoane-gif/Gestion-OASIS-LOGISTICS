import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchBrowser } from "./browser.mjs";

const origin = process.env.APP_URL || "http://localhost:3000";
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(origin);
await page.getByRole("heading", { name: "Bienvenue sur Gestion" }).waitFor();
assert.equal(new URL(page.url()).pathname, "/login");

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
    const input = document.querySelector(".otl-field input");
    const field = input.closest(".otl-field");
    const card = document.querySelector(".otl-card");
    const subtitle = document.querySelector(".otl-sub");
    return {
      input: ratio(
        getComputedStyle(input).color,
        getComputedStyle(field).backgroundColor,
      ),
      subtitle: ratio(
        getComputedStyle(subtitle).color,
        getComputedStyle(card).backgroundColor,
      ),
    };
  });
  assert.ok(
    ratios.input >= 4.5 && ratios.subtitle >= 4.5,
    "Readable form contrast",
  );
}
await checkFormContrast();
assert.equal(await page.locator(".otl-page .flat-truck").count(), 0);
assert.equal(await page.locator(".otl-page .truck-illustration").count(), 0);
assert.equal(await page.locator(".otl-page canvas").count(), 0);
assert.equal(await page.locator(".gestion-auth__three").count(), 0);
const background = await page.evaluate(() => {
  const style = getComputedStyle(
    document.querySelector(".otl-page"),
    "::before",
  );
  return style.backgroundImage;
});
assert.ok(background.includes("login-bg"), "The supplied background is used");
await page.screenshot({
  path: join(tmpdir(), "gestion-login-desktop.png"),
  fullPage: true,
  animations: "disabled",
});

// Validation vide : le message doit être annoncé dans role=alert.
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
await page.getByRole("alert").waitFor();
assert.ok(
  (await page.getByRole("alert").textContent()).includes("renseigner"),
);

// Téléphone : le format E.164 reste expliqué, même sans mot de passe.
await page.getByRole("button", { name: "Téléphone", exact: true }).click();
await page.getByLabel("Numéro de téléphone").fill("0700000000");
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
await page.getByRole("alert").filter({ hasText: "E.164" }).waitFor();
assert.ok((await page.getByRole("alert").textContent()).includes("E.164"));

// Récupération : même page, formulaire dédié puis retour.
await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
await page.getByRole("heading", { name: "Mot de passe oublié ?" }).waitFor();
await page.getByLabel("Adresse e-mail").fill("member@example.invalid");
assert.equal(
  await page.getByRole("button", { name: "Envoyer le lien" }).isEnabled(),
  true,
);
await page.getByRole("button", { name: "Retour à la connexion" }).click();
await page.getByRole("heading", { name: "Bienvenue sur Gestion" }).waitFor();

await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
await checkFormContrast(); // La connexion reste claire sans changer le thème enregistré.
await page.evaluate(() => (document.documentElement.dataset.theme = "light"));

for (const width of [820, 390, 360]) {
  await page.setViewportSize({ width, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    `No horizontal overflow at ${width}px`,
  );
  assert.equal(
    await page
      .getByLabel("Adresse e-mail")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
    true,
    `Readable input at ${width}px`,
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

// Retour OAuth en erreur : le formulaire reste accessible.
await page.goto(origin + "/auth/callback?error=access_denied");
await page.getByRole("alert").waitFor();
await page.getByRole("button", { name: "Retour à la connexion" }).click();
await page
  .getByRole("heading", { name: "Bienvenue sur Gestion" })
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
  "PASS: supplied login page, real form, phone validation, recovery form, callback errors, responsive layout, dashboard and loading animation components. No authenticated workflow was simulated.",
);
