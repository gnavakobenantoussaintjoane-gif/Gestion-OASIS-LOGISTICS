import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchBrowser } from "./browser.mjs";
const browser = await launchBrowser();
const origin = process.env.APP_URL || "http://localhost:3000";
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 950 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let release;
    const barrier = new Promise((resolve) => (release = resolve));
    await page.route("**/models/truck.glb", async (route) => {
      await barrier;
      await route.continue();
    });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: "Bienvenue sur Gestion" })
      .waitFor();
    await page.getByLabel("Adresse e-mail").fill("test@example.com"); // Form is interactive before model download.
    assert.equal(
      await page
        .locator(".gestion-auth__three")
        .getAttribute("data-scene-state"),
      "loading",
    );
    release();
    await page.waitForFunction(
      () =>
        document.querySelector(".gestion-auth__three")?.dataset.sceneState ===
        "ready",
      {},
      { timeout: 45000 },
    );
    assert.equal(await page.locator(".gestion-auth__three canvas").count(), 1);
    assert.equal(
      await page.locator(".gestion-auth__three").getAttribute("data-motion"),
      "off",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const resolution = await page
      .locator(".gestion-auth__three canvas")
      .evaluate((el) => ({
        width: el.width,
        cssWidth: el.getBoundingClientRect().width,
      }));
    assert.ok(
      resolution.width <= resolution.cssWidth * (width < 760 ? 1 : 1.5) + 2,
    );
    await page.screenshot({
      path: join(
        tmpdir(),
        `gestion-3d-${width === 1440 ? "desktop" : "mobile"}.png`,
      ),
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(
      () =>
        document.querySelector(".gestion-auth__three")?.dataset.motion === "on",
    );
    if (width === 1440) {
      await page
        .locator(".gestion-auth__three canvas")
        .evaluate((canvas) =>
          canvas
            .getContext("webgl2")
            ?.getExtension("WEBGL_lose_context")
            ?.loseContext(),
        );
      await page.waitForFunction(
        () =>
          document.querySelector(".gestion-auth__three")?.dataset.sceneState ===
          "static",
      );
      await page.getByLabel("Adresse e-mail").fill("context-loss@example.com");
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  const blocked = await browser.newPage();
  await blocked.route("**/models/truck.glb", (route) => route.abort());
  await blocked.goto(origin);
  await blocked.waitForFunction(
    () =>
      document.querySelector(".gestion-auth__three")?.dataset.sceneState ===
      "static",
  );
  await blocked
    .getByLabel("Adresse e-mail")
    .fill("still-interactive@example.com");
  await blocked.close();
  const noGL = await browser.newPage();
  await noGL.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    };
  });
  await noGL.goto(origin);
  await noGL
    .getByRole("heading", { name: "Bienvenue sur Gestion" })
    .waitFor();
  assert.equal(
    await noGL.locator(".gestion-auth__three").getAttribute("data-scene-state"),
    "static",
  );
  await noGL.getByLabel("Adresse e-mail").fill("fallback@example.com");
  await noGL.close();
  console.log(
    "PASS: actual GLB loaded/rendered on desktop and mobile (Chromium SwiftShader), form usable before asset load, bounded DPR, reduced motion, missing-model and no-WebGL fallbacks. No authenticated account tested.",
  );
} finally {
  await browser.close();
}
