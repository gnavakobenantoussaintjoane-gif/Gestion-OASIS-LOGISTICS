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
const tripRow = {
  id: "trip-test",
  reference: "V-TEST0001",
  accounting_date: "2026-11-14",
  occurred_at: "2026-11-14T08:00:00Z",
  truck_id: "truck-test",
  driver_id: "driver-test",
  shift: "day",
  terminal_id: "terminal-test",
  container_type_id: "type-20",
  load: "Plein",
  price: 100000,
  created_at: "2026-11-14T08:00:00Z",
  trip_containers: [
    { id: "tc-1", number: "CSQU3054383", size: 20 },
    { id: "tc-2", number: "MSCU1234566", size: 20 },
  ],
};
const containerAudit = [
  {
    id: "audit-1",
    action: "CONTAINER_ADDED",
    created_at: "2026-11-14T08:01:00Z",
    new_data: { number: "CSQU3054383", size: 20 },
  },
  {
    id: "audit-2",
    action: "CONTAINER_ADDED",
    created_at: "2026-11-14T08:02:00Z",
    new_data: { number: "MSCU1234566", size: 20 },
  },
];
let showTripRow = false;
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
    if (path === "/api/trips/trip-test/containers/history")
      return json(containerAudit);
    if (path === "/api/trips")
      return failing.trips
        ? failure("trips")
        : json(showTripRow ? { rows: [tripRow], total: 1, page: 1, limit: 20 } : emptyList);
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

  // 3 bis. Conteneurs : configuration 2 × 20 / 1 × 40 et validation avant écriture.
  failing.references = false;
  Object.assign(references, {
    trucks: [
      {
        id: "truck-test",
        plate: "CI-0000-TEST",
        brand: "Test",
        model: "Rendu",
        status: "Disponible",
        active: true,
      },
    ],
    drivers: [
      {
        id: "driver-test",
        first_name: "Test",
        last_name: "Chauffeur",
        status: "Actif",
        active: true,
      },
    ],
    terminals: [
      { id: "terminal-test", code: "ATL", name: "Abidjan Terminal", active: true },
    ],
    container_types: [
      { id: "type-20", name: "20 pieds sec", kind: "20_DRY", active: true },
      { id: "type-40", name: "40 pieds sec", kind: "40_DRY", active: true },
    ],
    tariff_rules: [
      {
        id: "tariff-test",
        terminal_id: "terminal-test",
        container_type_id: "type-20",
        load: "Plein",
        shift: "day",
        price: "100000",
        active: true,
      },
    ],
  });
  await page.goto(origin + "/records/trips");
  await page.getByRole("heading", { name: /Voyages/ }).waitFor();
  await page.getByRole("button", { name: "Ajouter voyage" }).first().click();
  const tripDialog = page.getByRole("dialog");
  await tripDialog.waitFor();
  const containers = tripDialog.getByRole("group", {
    name: /Informations sur les conteneurs/,
  });
  await containers.waitFor();
  await tripDialog.getByLabel("Camion").selectOption("truck-test");
  await tripDialog.getByLabel("Chauffeur").selectOption("driver-test");
  await tripDialog.getByLabel(/Date et heure de départ/).fill("2026-11-14T08:00");
  await tripDialog.getByLabel("Terminal portuaire").selectOption("terminal-test");
  await tripDialog.getByLabel("Tarif appliqué").selectOption("tariff-test");
  assert.equal(
    await containers.getByRole("radio", { name: /2 conteneurs de 20 pieds/ }).getAttribute("aria-checked"),
    "true",
  );
  assert.equal(await containers.getByLabel(/Numéro du conteneur 1/).count(), 1);
  assert.equal(await containers.getByLabel(/Numéro du conteneur 2/).count(), 1);
  await containers.getByLabel(/Numéro du conteneur 1/).fill("CSQU3054384");
  await tripDialog.getByRole("button", { name: "Enregistrer" }).click();
  await tripDialog.getByText(/ISO 6346/).first().waitFor();
  assert.equal(await tripDialog.isVisible(), true);
  await containers.getByRole("radio", { name: /1 conteneur de 40 pieds/ }).click();
  await containers.getByLabel(/^Numéro du conteneur\s*\*?$/).waitFor();
  assert.equal(await containers.getByLabel(/Numéro du conteneur 1/).count(), 0);
  await containers.getByText("Type : 40 pieds sec").waitFor();
  await containers.getByText("1 × 40 pieds").waitFor();
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

  // 7. Détail voyage : conteneurs et historique d’audit.
  showTripRow = true;
  await page.goto(origin + "/records/trips");
  await page.getByRole("heading", { name: /Voyages/ }).waitFor();
  await page.getByRole("button", { name: "Consulter" }).first().click();
  const detail = page.getByRole("dialog");
  await detail.getByRole("heading", { name: /Détails · voyage/ }).waitFor();
  await detail.getByText("Informations sur les conteneurs").waitFor();
  await detail.getByText("CSQU3054383").first().waitFor();
  await detail.getByText("Historique des conteneurs").waitFor();
  await detail.getByText("Ajout").first().waitFor();
  assert.equal(await detail.getByText("Ajout").count(), 2);
  await page.keyboard.press("Escape");
  showTripRow = false;

  assert.deepEqual(errors, []);
  console.log(
    "PASS: états chargement/erreur/vide, reprise après panne, références non bloquantes et formulaire sûr. Recette isolée, pas de workflow authentifié réel.",
  );
} finally {
  await browser.close();
}
