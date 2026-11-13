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
      return image?.complete && image.naturalWidth > 0;
    });
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
  await page.route("**/branding/otl-login-background.png", (route) =>
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
