// Recette isolée des états chargement / erreur / vide.
// Session et réponses HTTP de TEST uniquement : aucune écriture, aucun cookie réel,
// aucune donnée métier et aucune connexion Supabase.
import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";

const origin = process.env.APP_URL || "http://localhost:3000";
const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const references = Object.fromEntries(
  [
    "trucks",
    "drivers",
    "terminals",
    "container_types",
    "expense_categories",
    "tariff_rules",
    "shift_definitions",
  ].map((key) => [key, []]),
);
const emptyReport = {
  trips: [],
  expenses: [],
  trucks: [],
  totals: { revenue: "0", expenses: "0", profit: "0", trips: 0 },
};
const emptyList = { rows: [], total: 0, page: 1, limit: 20 };
// Les requêtes React Query réessaient automatiquement : le mode panne reste
// actif jusqu'à ce que le test l'éteigne juste avant de cliquer sur « Réessayer ».
const failing = {
  trips: false,
  references: false,
  dashboard: false,
  members: false,
  notifications: false,
};

await page.route(
  (url) => url.pathname.startsWith("/api/"),
  async (route) => {
    assert.equal(
      route.request().method(),
      "GET",
      "Cette recette ne doit jamais écrire",
    );
    const path = new URL(route.request().url()).pathname;
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    const failure = (key) =>
      json({ error: `Panne de test · ${key}` }, 503);

    if (path === "/api/auth/session")
      return json({
        user: { id: "test-render-only", email: "render@example.invalid" },
        profile: { full_name: "Test de rendu isolé" },
        company: { id: "test-company", name: "OTL — test de rendu" },
        role: "admin",
        isSuperAdmin: true,
      });
    if (path === "/api/reference-data")
      return failing.references ? failure("references") : json(references);
    if (path === "/api/dashboard")
      return failing.dashboard ? failure("dashboard") : json(emptyReport);
    if (path === "/api/notifications")
      return failing.notifications ? failure("notifications") : json([]);
    if (path === "/api/members") {
      if (failing.members) return failure("members");
      await new Promise((resolve) => setTimeout(resolve, 250));
      return json([]);
    }
    if (path === "/api/trips")
      return failing.trips ? failure("trips") : json(emptyList);
    if (
      [
        "/api/trucks",
        "/api/drivers",
        "/api/expenses",
        "/api/tariff_rules",
        "/api/terminals",
        "/api/container_types",
        "/api/expense_categories",
        "/api/audit_logs",
      ].includes(path)
    )
      return json(emptyList);
    return json([]);
  },
);

async function retry(alertText, clearFailure) {
  const alert = page.getByRole("alert").filter({ hasText: alertText });
  await alert.waitFor();
  clearFailure();
  await alert.getByRole("button", { name: "Réessayer" }).click();
  await alert.waitFor({ state: "detached" });
}

try {
  // 1. Erreur de liste puis reprise.
  failing.trips = true;
  await page.goto(origin + "/records/trips");
  await page.getByRole("heading", { name: /Voyages/ }).waitFor();
  await retry("Panne de test · trips", () => {
    failing.trips = false;
  });
  await page.getByText("Aucune opération pour le moment").waitFor();

  // 2. Références indisponibles : avertissement non bloquant puis reprise.
  failing.references = true;
  await page.goto(origin + "/records/trips");
  await page.getByRole("heading", { name: /Voyages/ }).waitFor();
  await retry("Les références", () => {
    failing.references = false;
  });
  assert.equal(
    await page.getByRole("alert").filter({ hasText: "Les références" }).count(),
    0,
  );

  // 3. Le formulaire ne peut pas enregistrer sans ses références.
  failing.references = true;
  await page.goto(origin + "/records/trucks");
  await page.getByRole("heading", { name: /Camions/ }).waitFor();
  await page.getByRole("button", { name: "Ajouter camion" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("alert").filter({ hasText: "références" }).waitFor();
  assert.equal(
    await dialog.getByRole("button", { name: "Enregistrer" }).isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");

  // 4. Erreur du dashboard puis reprise sur les indicateurs réels à zéro.
  failing.dashboard = true;
  await page.goto(origin + "/");
  await retry("Panne de test · dashboard", () => {
    failing.dashboard = false;
  });
  await page.getByText("Total camions").waitFor();
  await page.getByText("Vos performances prendront forme ici.").waitFor();

  // 5. Équipe : erreur, chargement, puis état vide.
  failing.members = true;
  await page.goto(origin + "/settings");
  await page.getByRole("heading", { name: /Paramètres/ }).waitFor();
  const membersAlert = page
    .getByRole("alert")
    .filter({ hasText: "Panne de test · members" });
  await membersAlert.waitFor();
  failing.members = false;
  await membersAlert.getByRole("button", { name: "Réessayer" }).click();
  await page.getByText("Chargement de l’équipe…").waitFor();
  await page.getByText("Aucun utilisateur n’est encore rattaché").waitFor();

  // 6. Notifications : erreur puis état vide.
  failing.notifications = true;
  await page.goto(origin + "/notifications");
  await page.getByRole("heading", { name: /Notifications/ }).waitFor();
  await retry("Panne de test · notifications", () => {
    failing.notifications = false;
  });
  await page.getByText("Vous êtes à jour.").waitFor();

  assert.deepEqual(errors, []);
  console.log(
    "PASS: états chargement/erreur/vide, reprise après panne, références non bloquantes et formulaire sûr. Recette isolée, pas de workflow authentifié réel.",
  );
} finally {
  await browser.close();
}
