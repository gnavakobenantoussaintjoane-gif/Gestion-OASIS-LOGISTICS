import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const browser = await launchBrowser();
const origin = process.env.APP_URL || "http://localhost:3000";
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const requests = [],
      errors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin);
    await page
      .getByRole("heading", { name: "Bienvenue sur Gestion" })
      .waitFor();
    await page.waitForFunction(() => {
      const image = document.querySelector(".otl-auth-background");
      const trucks = document.querySelector(".otl-auth-trucks");
      // Le recadrage étroit est différé (loading="lazy") : on ne l'exige que s'il est affiché.
      const narrow = getComputedStyle(trucks).display !== "none";
      return (
        image?.complete &&
        image.naturalWidth > 0 &&
        (!narrow || trucks.complete)
      );
    });
    // Le décor des écrans étroits doit rester net : aucun filtre de flou.
    assert.equal(
      await page.evaluate(() => {
        const trucks = document.querySelector(".otl-auth-trucks");
        const wide = document.querySelector(".otl-auth-background");
        const filters = [trucks, wide].map(
          (element) => getComputedStyle(element).filter,
        );
        return filters.every((filter) => filter === "none");
      }),
      true,
      "Login artwork must not be blurred",
    );
    assert.equal(await page.locator(".gestion-auth canvas").count(), 0);
    assert.equal(await page.locator(".gestion-auth__three").count(), 0);
    assert.equal(
      requests.some(
        (url) => url.includes("/models/truck.glb") || url.includes("/login3d/"),
      ),
      false,
      "No 3D assets requested on Auth",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    // Dès 1100 px, la carte HTML recouvre exactement la carte dessinée dans la
    // maquette : même rectangle, même centre, aucun décalage visible.
    if (width > 1100) {
      // L'apparition de la carte dure 0,55 s : on l'attend avant de mesurer
      // sa position (les animations de décor sont infinies, on les ignore).
      await page.evaluate(async () => {
        const card = document.querySelector(".gestion-auth__card");
        const intro = card
          ?.getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations !== Infinity,
          );
        await Promise.all(
          (intro ?? []).map((a) => a.finished.catch(() => undefined)),
        );
      });
      const placement = await page.evaluate(() => {
        const image = document
          .querySelector(".otl-auth-background")
          .getBoundingClientRect();
        const panel = document
          .querySelector(".gestion-auth__panel")
          .getBoundingClientRect();
        const card = document
          .querySelector(".gestion-auth__card")
          .getBoundingClientRect();
        const drawn = {
          left: image.left + image.width * (575 / 1672),
          right: image.left + image.width * (1097 / 1672),
          top: image.top + image.height * (155 / 941),
          bottom: image.top + image.height * (812 / 941),
        };
        const drawnWidth = drawn.right - drawn.left;
        return {
          dx: Math.abs(
            (panel.left + panel.right) / 2 - (drawn.left + drawn.right) / 2,
          ),
          dy: Math.abs(
            (panel.top + panel.bottom) / 2 - (drawn.top + drawn.bottom) / 2,
          ),
          ratio: panel.width / drawnWidth,
          // Le formulaire réel doit tenir entièrement dans la carte.
          cardInside:
            card.left >= panel.left - 1 &&
            card.right <= panel.right + 1 &&
            card.top >= panel.top - 1 &&
            card.bottom <= panel.bottom + 1,
        };
      });
      assert.ok(
        placement.dx < 3 && placement.dy < 3,
        `Panel must stay centred on the mockup card at ${width}px (dx=${placement.dx}, dy=${placement.dy})`,
      );
      assert.ok(
        placement.ratio > 0.99 && placement.ratio < 1.01,
        `Panel must match the mockup card at ${width}px (ratio=${placement.ratio})`,
      );
      assert.equal(
        placement.cardInside,
        true,
        `The form card must stay inside the panel at ${width}px`,
      );
    }
    await page.getByLabel("Adresse e-mail").fill("static@example.invalid");
    await page.getByLabel("Mot de passe", { exact: true }).fill("test-only");
    await page.screenshot({
      path: join(tmpdir(), `otl-static-${width}.png`),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await page.close();
  }
  // A missing image must never block access to the real form.
  const page = await browser.newPage();
  await page.route("**/branding/otl-login-stage.jpg", (route) =>
    route.abort(),
  );
  await page.goto(origin);
  await page.getByLabel("Adresse e-mail").fill("fallback@example.invalid");
  assert.equal(await page.locator(".gestion-auth canvas").count(), 0);
  await page.close();
  console.log(
    "PASS: supplied static image, no WebGL/GLB load on login, usable form and mobile layout, missing-image fallback. No real login tested.",
  );
} finally {
  await browser.close();
}
