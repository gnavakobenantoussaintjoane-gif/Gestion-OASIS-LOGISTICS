# Supabase — base créée, interface encore locale

## État au 11 novembre 2026

La migration `supabase/migrations/20261111174500_create_oasis_database.sql` a été exécutée dans le projet **Gestion-OASIS-LOGISTICS** (`nrwfnqtomyamswirrhqv`). Les tables étaient absentes avant cette opération. Aucune donnée de démonstration ni compte utilisateur n’a été importé.

| Table | Contenu |
| --- | --- |
| `public.trucks` | Propriétaire, immatriculation, chauffeur, statut |
| `public.trips` | Date de départ, camion, shift, terminal, conteneur, état, quantité, tarif, encaissement, recette calculée |
| `public.expenses` | Date, camion/voyage facultatifs, catégorie, description, montant payé |

Chaque table a une clé UUID, un `owner_id` lié à Supabase Auth et des dates de création/modification. Les plaques sont uniques par propriétaire sans distinction de casse. Les clés étrangères empêchent de relier des opérations de propriétaires différents. Le camion d’une dépense liée doit être celui de son voyage.

La recette est calculée en base (`quantity * price`), l’encaissement ne peut pas la dépasser. Les montants sont stockés avec une échelle de zéro décimale en FCFA ; PostgreSQL arrondit les fractions entrantes. L’application actuelle valide déjà des montants entiers. Un camion utilisé est protégé contre la suppression ; supprimer un voyage conserve ses dépenses en retirant seulement leur lien au voyage. Modifier le camion du voyage reporte le changement sur ses dépenses liées.

## Sécurité

- RLS activée sur les trois tables.
- Une politique par table autorise uniquement le propriétaire connecté (`auth.uid() = owner_id`) à lire, ajouter, modifier et supprimer ses lignes.
- Le rôle anonyme n’a aucun droit de lecture/écriture.
- `authenticated` reçoit uniquement les droits SELECT, INSERT, UPDATE et DELETE, sous réserve des politiques RLS.
- Pas de clé d’API ni de mot de passe ajouté au dépôt.

**Attention : ce modèle isole les données par utilisateur, pas par entreprise partagée.** Les rôles métier, les équipes et la piste d’audit ne sont pas encore implémentés. La présence de politiques a été vérifiée dans le catalogue PostgreSQL ; les parcours avec deux vrais utilisateurs restent à tester lors du raccordement de l’authentification.

## Vérifications effectuées

- Trois tables présentes, toutes vides après création.
- RLS et politique propriétaire présentes sur chaque table.
- Lecture anonyme interdite et droits CRUD authentifiés présents.
- Colonne `revenue` générée par PostgreSQL.
- Trois déclencheurs de mise à jour de `updated_at` présents.
- Clé étrangère composite de la dépense vers le voyage vérifiée.

La migration enregistrée ici est une migration initiale pour une base vide, **pas un script à réexécuter sur le projet déjà initialisé**. Ne pas utiliser `drizzle.config.json` : c’est une ancienne configuration locale sans rapport avec cette migration Supabase.

## Connexion de l’application — à faire

L’interface ne contacte toujours pas Supabase. Les voyages saisis dans le navigateur ne sont donc **pas encore envoyés à la base**. Le profil « Administrateur » affiché n’est pas un compte authentifié.

Prochaines étapes :
1. Ajouter Supabase Auth et les parcours de connexion/déconnexion.
2. Configurer l’URL et une clé publiable, jamais une clé `service_role` côté navigateur.
3. Remplacer les accès `localStorage` par des opérations authentifiées sur les trois tables ; mapper les champs camelCase de l’interface vers les colonnes snake_case, et les identifiants de démonstration vers de vrais UUID.
4. Tester l’isolation entre deux utilisateurs et les rejets de montants/références incorrects.
5. Prévoir un import explicite des données locales, sans importer automatiquement les données fictives.
6. Pour une équipe : concevoir les entreprises, membres et rôles, puis faire évoluer les politiques.
7. Ajouter journal de paiements datés, audit et sauvegardes avant un usage financier de production.
