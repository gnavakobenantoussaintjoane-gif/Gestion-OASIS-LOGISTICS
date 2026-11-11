import { adminSupabase } from "../src/config/adminSupabase.js";
const email = "gnavakobenan@gmail.com";
async function run() {
  const client = adminSupabase();
  let ownerId: string | undefined;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error)
      throw new Error(
        "Impossible de lire les comptes Auth. Vérifiez la configuration et le réseau.",
      );
    const existing = data.users.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      if (!existing.email_confirmed_at)
        throw new Error(
          "Le compte existant doit être confirmé avant provisionnement.",
        );
      ownerId = existing.id;
      break;
    }
    if (data.users.length < 1000) break;
  }
  if (!ownerId) {
    const password = process.env.OASIS_BOOTSTRAP_PASSWORD;
    delete process.env.OASIS_BOOTSTRAP_PASSWORD;
    if (!password || password.length < 10)
      throw new Error(
        "Fournissez OASIS_BOOTSTRAP_PASSWORD via une saisie masquée (10 caractères minimum).",
      );
    const created = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw new Error(
        "Création du compte impossible. Aucun mot de passe n’est affiché.",
      );
    ownerId = created.data.user.id;
  }
  const { data, error } = await client.rpc("oasis_bootstrap_owner", {
    owner_id: ownerId,
  });
  if (error)
    throw new Error(
      "Compte Auth présent mais provisionnement non confirmé. Vérifiez les migrations puis relancez ce script : le mot de passe existant ne sera pas modifié.",
    );
  console.log(
    `Propriétaire configuré : ${email}\nOASIS_COMPANY_ID=${data}\nReportez cet identifiant dans la configuration serveur puis redémarrez l’API.`,
  );
}
run().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Provisionnement échoué.",
  );
  process.exitCode = 1;
});
