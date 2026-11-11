import { lookup } from "node:dns/promises";
import { env } from "../src/config/env.js";

// No password, session token or administrative key is required or logged.
async function run() {
  const url = new URL(env.SUPABASE_URL);
  console.log(`Projet Supabase : ${url.hostname}`);
  console.log(
    `Entreprise : ${env.OASIS_COMPANY_ID ? "configurée" : "MANQUANTE"}`,
  );
  if (!env.OASIS_COMPANY_ID) process.exitCode = 1;
  try {
    await lookup(url.hostname);
    console.log("DNS : OK");
  } catch {
    console.error("DNS : échec. Vérifiez le résolveur du serveur.");
    process.exitCode = 1;
    return;
  }
  try {
    const result = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (!result.ok) {
      console.error(
        `Supabase Auth : HTTP ${result.status}. Vérifiez le projet et sa clé publique.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      "Supabase Auth : joignable (HTTP 200). Ce test ne valide pas une connexion utilisateur.",
    );
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : "connexion interrompue ou délai dépassé";
    console.error(
      `HTTPS Supabase : échec (${code}). Vérifiez la sortie HTTPS/443, le pare-feu et les restrictions réseau de l’hébergement. Ne désactivez pas TLS ou les contrôles Auth.`,
    );
    process.exitCode = 1;
  }
}
run().catch(() => {
  console.error("Diagnostic impossible. Vérifiez la configuration du serveur.");
  process.exitCode = 1;
});
