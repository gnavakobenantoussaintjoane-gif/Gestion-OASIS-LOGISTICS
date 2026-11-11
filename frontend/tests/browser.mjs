import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
export async function launchBrowser() {
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
  return chromium.launch({
    executablePath: await serverChromium.executablePath(),
    args: [
      ...serverChromium.args.filter((arg) => arg !== "--single-process"),
      "--enable-unsafe-swiftshader",
    ],
    headless: true,
  });
}
