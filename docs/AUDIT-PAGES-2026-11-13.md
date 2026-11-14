# Audit « relier toutes les pages à la base » — 13 novembre 2026

Branche : `arena/6c6f22e9-gestion-oasis-logistics`, depuis `main` (`7a8c24e`).
Périmètre : application privée OASIS LOGISTICS (frontend React/Vite, API Express, Supabase).

## 1. Verdict

- **Aucun écran ne contient de mock, fixture, donnée aléatoire ou tableau codé en dur.** Toutes les listes, tous les indicateurs, exports, notifications et formulaires passent déjà par `api()` ou par le client Auth Supabase.
- Le travail réel n'était donc pas « remplacer des mocks », mais :
  1. compléter les **états chargement / erreur / vide** encore absents ;
  2. aligner certains **droits d'interface** sur les rôles réels ;
  3. vérifier le **contrat API ↔ base** (routes, RLS, contraintes, index) ;
  4. produire une **recette reproductible** des états et des rôles.
- La base distante `Gestion-OASIS-LOGISTICS` (`nrwfnqtomyamswirrhqv`, eu-west-1) a été inspectée en **lecture seule** : RLS active sur les 18 tables `public`, 56 index (51 avant les 5 index ajoutés par ce chantier), contraintes et policies vérifiées. La base métier est **vide** : 0 camion, 0 chauffeur, 0 voyage, 0 dépense, 0 tarif, 0 notification. Les écrans vides sont donc l'état réel actuel.

## 2. Méthode et limites

| Élément | Réalité |
| --- | --- |
| Audit statique | lecture de toutes les pages, composants, hooks, services, routes API, schémas Zod et migrations |
| Base distante | connecteur Supabase en lecture seule : `pg_class`, `pg_policies`, `pg_constraint`, `pg_indexes`, `count(*)`, `list_migrations` |
| Recette navigateur | rendu **isolé** : session et réponses `/api/*` simulées dans le test, aucune écriture, aucun cookie réel, aucune connexion Supabase |
| Limite réseau | le sandbox ne joint pas Supabase (`ECONNRESET`) : **aucun parcours réellement authentifié de bout en bout** n'a pu être exécuté ici. Les tests de connexion/Google/email restent des contrats simulés. |

Légende : ✅ état présent et testé ; ⚠️ présent mais partiel ; — sans objet.

## 3. Matrice écran par écran

### 3.1 Authentification et entrée

| Écran / route | Rôles | Appels | Chargement · Erreur · Vide | Écarts / action |
| --- | --- | --- | --- | --- |
| `/login` | public | `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/google`, `GET /auth/session` | ✅ · ✅ · — (formulaire) | quotas et messages déjà testés ; aucune base métier |
| `/auth/callback` | public | `POST /auth/callback`, `GET /auth/session` | ✅ · ✅ · — | PKCE/stockage testés ; dépend de la configuration Google externe |
| `/auth/reset-password` | public | `POST /auth/recovery/password` | ✅ · ✅ · — | email de récupération à configurer chez Supabase |
| `Onboarding` (session sans entreprise/rôle) | connecté non rattaché | `GET /auth/session` via `reload()` | ✅ · ✅ · — | **corrigé** : bouton « Vérification… » désactivé et erreur réseau affichée |

### 3.2 Espace métier

| Écran / route | Rôles | Appels | Chargement · Erreur · Vide | Écarts / action |
| --- | --- | --- | --- | --- |
| `/` Tableau de bord | admin, manager | `GET /dashboard`, `GET /reference-data`, `GET /notifications` (layout) | ✅ · ✅ · ✅ (global + graphiques + tableau) | agrégats encore calculés côté client sur jusqu'à 100 000 lignes ; **corrigé** : message vide du tableau performance/shift ; état « période vide » explicite |
| `/reports` (mode rapport du dashboard) | admin, manager | `GET /dashboard`, exports `GET /reports/xlsx|pdf` | ✅ · ✅ · ✅ | exports avec toasts ; pas d'état de fichier en cours dans le bouton, voir §6 |
| `/shifts` (mode shifts du dashboard) | admin, manager | `GET /dashboard` | ✅ · ✅ · ✅ | même agrégation client ; tableau « Shifts par date comptable » |
| `/records/trips` | admin, manager, operator (écriture) ; driver (lecture de ses missions) | `GET/POST/PATCH/DELETE /trips`, `GET /reference-data` | ✅ · ✅ (+ avertissement références) · ✅ | **corrigé** : opérateur ne peut éditer que ses propres voyages, aligné sur la policy `trips_update` ; avertissement non bloquant si les références manquent |
| `/records/trucks` | admin, manager (écriture) ; operator/manager en lecture selon navigation | `GET/POST/PATCH/DELETE /trucks`, `GET /reference-data` | ✅ · ✅ · ✅ | suppression = archivage (`archived: true`), jamais de perte d'historique |
| `/records/drivers` | admin, manager (écriture) | `/drivers`, `GET /reference-data`, `GET /members` | ✅ · ✅ · ✅ | le sélecteur de compte dépend de `/members` ; **corrigé** : erreur de `/members` affichée avec reprise |
| `/records/expenses` | admin, manager | `/expenses`, `/reference-data`, `GET /trips?limit=50`, justificatifs | ✅ · ✅ · ✅ | **corrigé** : erreur des voyages récents affichée ; justificatif sans état d'envoi dédié (§6) |
| `/records/tariff_rules` | admin (écriture), manager (lecture) | `/tariff_rules`, `/reference-data` | ✅ · ✅ · ✅ | tarif actif unique garanti par l'index partiel `gestion_active_tariff` |
| `/records/terminals` | admin (écriture) | `/terminals`, `/reference-data` | ✅ · ✅ · ✅ | — |
| `/records/container_types` | admin (écriture) | `/container_types`, `/reference-data` | ✅ · ✅ · ✅ | — |
| `/records/expense_categories` | admin (écriture) | `/expense_categories`, `/reference-data` | ✅ · ✅ · ✅ | — |
| Formulaires de ressource | selon ressource | références + références secondaires | ✅ · ✅ (nouveau) · — | **corrigé** : bandeau d'erreur « références indispensables » et bouton Enregistrer désactivé tant que les références ne sont pas disponibles ; erreurs `/members` ou voyages récents avec reprise |
| `/settings` | tous ; carte équipe = super administrateur | `GET /members` (super admin uniquement), `PATCH /profile`, `PATCH /company` | ✅ · ✅ (nouveau) · ✅ (nouveau) | **corrigé** : `/members` n'est plus appelé pour un administrateur non super admin ; chargement, erreur avec reprise et état vide de l'équipe |
| `/notifications` | tous | `GET /notifications`, `PATCH /notifications/:id/read` | ✅ · ✅ · ✅ | **corrigé** : conteneur d'erreur en `role="alert"` |
| `/audit` | admin, manager | `GET /audit-logs` | ✅ · ✅ · ✅ | audit en lecture seule ; l'état vide affiche encore « Vous êtes à jour », formulation à ajuster |
| Layout (`AppLayout`) | tous | `GET /notifications` toutes les 30 s | ✅ · ✅ (toast silencieux) · — | compteur de non-lus ; le layout ne doit jamais bloquer une page si la base est indisponible |

### 3.3 Synthèse des états

- **Chargement** : listes (`ResourcePage`), dashboard, notifications, audit, équipe, formulaires de ressource. Les **selects** de formulaire n'ont pas encore d'indicateur propre quand les références arrivent (le bouton Enregistrer est désactivé, ce qui protège l'écriture).
- **Erreur** : toutes les pages affichent désormais le message exact de l'API, avec un bouton « Réessayer » ; les pannes de références sont signalées sans masquer les données déjà affichées.
- **Vide** : listes, dashboard, graphiques, notifications, audit, équipe, tableau performance/shift, formulaire de dépense sans voyage. Le cas « période sans opération » est explicite.

## 4. Contrat API ↔ base

| Route | Rôles | Particularités vérifiées |
| --- | --- | --- |
| `GET /reference-data` | tous les rôles métier | jeu réduit selon le rôle (le chauffeur voit ses camions/terminaux/conteneurs, l'opérateur n'a pas les finances) |
| `GET /dashboard` | admin, manager | `trips` + `expenses` + `trucks` + totaux exacts ; bornes de période et filtres ; plafond de lecture |
| `GET /reports/xlsx`, `/reports/pdf` | admin, manager | mêmes filtres que la liste ; nom de fichier et contenu testés |
| `GET /notifications` | tous | 100 dernières, personnelles |
| `PATCH /notifications/:id/read` | tous | notification personnelle uniquement |
| `GET /members` | admin, manager | équipe et rôles de l'entreprise |
| `POST /members` | super administrateur | rattachement/modification de rôle |
| `POST /members/accounts` | super administrateur | création de compte Auth, clé administrative strictement serveur |
| `PATCH /company` | admin | nom, téléphone, adresse |
| `PATCH /profile` | tous | son propre profil uniquement |
| `GET /audit-logs` | admin, manager | 100 dernières écritures de l'entreprise |
| `POST/GET /expenses/:id/receipt` | admin, manager | bucket privé `gestion-receipts`, 5 Mo, PDF/JPEG/PNG, URL signée 60 s |
| `resourcesRouter` | matrice ci-dessous | `company_id` et `created_by` imposés serveur ; `created_by` immuable |

### 4.1 Rôles d'écriture des ressources (source : `validators/resources.ts`)

| Ressource | admin | manager | operator | driver |
| --- | --- | --- | --- | --- |
| trucks | ✅ | ✅ | — | — |
| drivers | ✅ | ✅ | — | — |
| trips | ✅ | ✅ | ✅ (ses créations en modification, policy `trips_update`) | — |
| expenses | ✅ | ✅ | — | — |
| tariff_rules / terminals / container_types / expense_categories | ✅ | — | — | — |

### 4.2 Rôles de lecture (`readAllowed`)

- **admin / manager** : toutes les ressources.
- **operator** : trucks, drivers, trips, référentiels ; **exclus** : expenses, audit_logs, profiles.
- **driver** : drivers et trips (RLS `trips_read` : ses missions via `drivers.user_id`).
- rôle inconnu/absent : refus total (test `backend/tests/accessMatrix.test.ts`).

### 4.3 Base distante — état vérifié

- **18 tables** dans `public`, **RLS active partout** (19 depuis la migration `trip_containers` du 14 novembre, voir §8).
- Policies : `trips` 4, `expenses` 4, `trucks` 3, `drivers` 3, `terminals` 3, `container_types` 3, `shift_definitions` 3, `companies` 2, `profiles` 2, `notifications` 2, `tariff_rules` 2, `expense_categories` 2, `audit_logs` 1, `user_roles` 1, `oasis_super_admin` **0** (volontaire : accès service role uniquement), tables `legacy_*` 1 chacune.
- Contraintes clés : `UNIQUE(company_id, id)` sur les tables métier, `UNIQUE(company_id, reference)` sur trips/expenses, `UNIQUE(company_id, plate upper(trim))` sur trucks, `UNIQUE(company_id, code)` sur terminals/shift_definitions, `UNIQUE(company_id, kind)` sur container_types, index unique partiel `gestion_active_tariff`.
- Triggers/fonctions : `gestion_prepare_trip()` (shift et date comptable Africa/Abidjan, refus 18:30–19:00, prix du tarif, `created_by` immuable), `gestion_prepare_expense()`, `gestion_audit()`, `gestion_trip_availability()` (camion non archivé/hors maintenance, chauffeur actif, terminal/conteneur actifs), `gestion_sync_trip_expenses()`.
- Volumétrie : `companies` 1, `profiles` 1, `user_roles` 1, `oasis_super_admin` 1, `terminals` 2, `container_types` 3, `expense_categories` 11, `audit_logs` 1 ; **trucks/drivers/trips/expenses/tariff_rules/notifications = 0**.
- Policies `trips` lues : `trips_read` (admin/manager/operator ou chauffeur propriétaire), `trips_insert` (admin/manager/operator, `created_by = auth.uid()`), `trips_update` (admin/manager ou opérateur `created_by = auth.uid()`), `trips_delete` (admin/manager). L'interface opérateur a été alignée sur cette règle.

## 5. Écarts et corrections

### Corrigés dans ce chantier

| # | Écran / couche | Correction |
| --- | --- | --- |
| 1 | `Settings` | `GET /members` réservé au super administrateur ; ajout chargement, erreur + reprise, état vide de l'équipe |
| 2 | `ResourcePage` | avertissement non bloquant + reprise si `/reference-data` échoue ; bouton Modifier limité aux créations de l'opérateur |
| 3 | `ResourceForm` | bandeau d'erreur des références indispensables ; Enregistrer désactivé ; erreurs `/members` et voyages récents avec reprise |
| 4 | `Dashboard` | état vide du tableau performance/shift |
| 5 | `Notifications` | erreur en `role="alert"` |
| 6 | `Onboarding` | état de vérification et erreur de session visibles |
| 7 | Base | migration `20261114003715_gestion_performance_indexes` **appliquée** : `trips(company_id, driver_id)`, `trips(company_id, terminal_id)`, `trips(company_id, container_type_id)`, `expenses(company_id, trip_id)`, `drivers(company_id, user_id)` (5/5 vérifiés dans `pg_indexes`) |
| 8 | Tests | `backend/tests/accessMatrix.test.ts` (matrice des droits) et `frontend/tests/pageStates.mjs` (états + reprise + formulaire bloqué sans références) |
| 9 | `/audit` | état vide spécifique « Aucune écriture journalisée. » |

### Restants, par priorité

1. **Agrégation du dashboard côté base** : `/dashboard` rapatrie jusqu'à 100 000 lignes puis calcule en JS. À remplacer par une vue/RPC d'agrégats filtrés (recettes, dépenses, bénéfice, tops camions, shifts) pour tenir la charge et supprimer le plafond silencieux.
2. **Filtres réellement appliqués** : `FiltersBar` envoie tous les paramètres sur toutes les pages ; le backend n'applique que les colonnes existantes. Afficher dans l'UI les filtres actifs ou masquer les filtres non supportés par la ressource.
3. **PATCH des voyages** : le schéma partiel ne recalcule ni shift, ni date comptable, ni prix ; un changement de `occurred_at`, `tariff_rule_id` ou `load` peut laisser des valeurs dérivées incohérentes. Ajouter une validation/trigger `BEFORE UPDATE` ou interdire ces champs en PATCH.
4. **Dépenses liées à un voyage** : le trigger `gestion_sync_trip_expenses` réécrit camion/chauffeur/shift depuis le voyage ; un PATCH partiel peut donc être silencieusement corrigé. Le documenter dans le formulaire et refuser les champs contradictoires.
5. **Justificatif et exports** : `ResourcePage.receipt()` et les boutons d'export n'ont pas d'état « envoi/génération » ; ajouter un état busy et empêcher le double clic.
6. **Sélecteurs de formulaire** : afficher un état de chargement des options et un message « aucune référence disponible » plutôt qu'un select vide.
7. **Recette authentifiée réelle** : impossible depuis ce sandbox ; à rejouer sur un poste connecté à Supabase avec un admin, un manager, un opérateur, un chauffeur et un compte non rattaché.
8. **Cohérence des migrations** : les versions distantes (`20261111173522`, `20261111174805`, `20261111175811`, `20261111180409`, `20261111205805`, `20261111205816`) diffèrent des noms de fichiers locaux (`…174500`, `…180000`, `…190000`, `…193000`, `…210000`, `…220000`). Le contenu a été appliqué, mais l'historique n'est pas réconcilié ; à aligner avant le prochain déploiement.
9. **Tests RLS** : les policies ont été inspectées mais les tests SQL transactionnels doivent être rejoués contre la base distante lors de la recette finale (le 14 novembre, un test transactionnel **admin** sur les conteneurs a été exécuté et annulé ; manager/opérateur/chauffeur restent à rejouer, voir §8.3).

## 6. Recette exécutée le 13 novembre 2026

| Contrôle | Résultat |
| --- | --- |
| `npx tsc -p frontend/tsconfig.json --noEmit` | ✅ |
| `npx tsc -p backend/tsconfig.json --noEmit` | ✅ |
| `npm run lint` (ESLint frontend + backend) | ✅ |
| `npm test` | ✅ **99 tests** : 67 backend (dont 8 de matrice d'accès) + 32 frontend |
| `node frontend/tests/otlPages.mjs` | ✅ 37 combinaisons page/rôle, desktop/mobile, états vides, rendu isolé |
| `node frontend/tests/pageStates.mjs` | ✅ erreur → reprise → vide sur listes, dashboard, équipe, notifications ; références non bloquantes ; formulaire bloqué sans références |
| `node frontend/tests/loginStatic.mjs` | ✅ connexion, validation, récupération, responsive |
| `node frontend/tests/smoke.mjs` | ✅ connexion, erreurs de callback, dashboard, animation |
| Migration distante | ✅ `gestion_performance_indexes` appliquée, 5 index vérifiés |
| Recette Supabase authentifiée | ❌ non exécutable dans ce sandbox (réseau bloqué), voir §5.7 |

## 7. Conclusion

Les pages sont **toutes reliées à la base** : aucun mock ne subsiste et les appels réseau sont les mêmes que ceux vérifiés dans l'API. Le chantier a surtout fermé les **angles morts d'ergonomie et de droits** (états, reprise, opérateur, super administrateur) et ajouté une **migration d'index** ainsi qu'une **matrice de droits testée**. Les trois prochains gains de robustesse sont l'agrégation serveur du dashboard, la cohérence des PATCH dérivés et la recette authentifiée réelle sur Supabase.

## 8. Mise à jour conteneurs — 14 novembre 2026

Branche `arena/c0063126-gestion-oasis-logistics`, depuis `eedfff8`. Cette passe relie la **traçabilité des conteneurs** aux pages concernées et ajoute la table de base correspondante.

### 8.1 Base et contrat

- Migration **`20261114010753_trip_containers` appliquée** sur `nrwfnqtomyamswirrhqv` (dernière version de `list_migrations`).
- Nouvelle table `public.trip_containers` : `id`, `company_id`, `trip_id`, `number`, `size` (20/40), `created_by`, `created_at`, `updated_at`. Clés `UNIQUE(trip_id, number)`, `UNIQUE(company_id, id)`, FK composite `(company_id, trip_id) → trips(company_id, id) ON DELETE CASCADE`. CHECK ISO 6346 (`number = upper(btrim(number))` + fonction `gestion_iso6346_valid`). Index `(company_id, trip_id)` et `(company_id, number)`.
- Règles différées : `gestion_trip_containers_valid` (table fille) et `gestion_trip_containers_required` (table `trips`) sont **DEFERRABLE INITIALLY DEFERRED** : une mission `20_DRY` doit avoir exactement deux conteneurs de taille 20, une mission `40_DRY`/`40_REEFER` exactement un conteneur de taille 40. Une mission sans type correspondant n’est pas contrainte.
- RPC `gestion_save_trip(p_id, p_payload, p_containers)` : écrit le voyage et remplace ses conteneurs dans la même transaction ; SECURITY INVOKER, `search_path = ''`, GRANT à `authenticated`. Le POST/PATCH de l’API passent par cette RPC.
- RLS : `trip_containers_read` (admin/manager/operator, ou chauffeur du voyage) et `trip_containers_write` (admin/manager, ou opérateur si `trips.created_by = auth.uid()`). `anon` n’a aucun droit.
- Audit : `CONTAINER_ADDED`, `CONTAINER_UPDATED`, `CONTAINER_REMOVED` avec `entity = 'trip_containers'`, `entity_id = trip_id` ; l’historique est lisible par `GET /trips/:uuid/containers/history` (admin/manager).
- Le nombre total de tables `public` passe de 18 à **19** ; les index de 56 à **58**. Le reste des policies et le volume métier (tables vides) sont inchangés.

### 8.2 Écran par écran

| Écran / route | Ce qui lit la base | États | Limites / décisions |
| --- | --- | --- | --- |
| `/records/trips` — formulaire | `GET /reference-data` (types de conteneurs), `POST/PATCH /trips` avec `containers` | types : chargement / erreur / aucun type actif ; numéros : erreur de format et de doublon ; erreur API `containers*` en bandeau | 2 × 20 ou 1 × 40 imposé ; le type 40 multiple est sélectionnable ; la validation ISO et le contrôle de cohérence sont faits **avant** `window.confirm` et de nouveau côté serveur. Aucune valeur n’est inventée. |
| `/records/trips` — liste | `GET /trips` (jointure `trip_containers`) | chargement / erreur + reprise / vide | colonne **Conteneurs** : mode + type + pastilles de numéros ; « Non renseigné » pour un ancien voyage sans conteneurs. |
| `/records/trips` — fiche | `GET /trips/:id` + `GET /trips/:id/containers/history` | résumé immédiat ; historique : chargement / erreur + reprise / vide | l’historique n’est demandé et affiché que pour admin/manager ; un opérateur voit les numéros mais pas l’historique, conformément au contrat serveur. |
| `/records/trucks` — fiche | `GET /trips?truck_id=…&limit=10` (chaque ligne avec ses conteneurs) | chargement / erreur + reprise / vide | 10 dernières missions ; le chauffeur et les numéros sont affichés ; aucun nouvel endpoint. |
| `/` — Derniers mouvements | `GET /dashboard` (déjà chargé) | chargement / erreur / vide existants | la cellule conteneurs réutilise `trip_containers` de la ligne, sans requête supplémentaire ni mock. |
| Exports Excel/PDF | `GET /reports/xlsx|pdf` | états existants | feuille **Voyages** : colonnes `Conteneurs` et `Nb conteneurs` ; test Excel ajouté. |

### 8.3 Recette exécutée le 14 novembre 2026

| Contrôle | Résultat |
| --- | --- |
| `./node_modules/.bin/tsc -p backend/tsconfig.json --noEmit` | ✅ |
| `./node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ **121 tests** : 82 backend + 39 frontend (dont 14 tests backend et 7 tests frontend dédiés aux conteneurs) |
| `npm run test:states` | ✅ conteneurs 2 × 20 / 1 × 40, erreur ISO avant écriture, fiche + historique, reprise des états existants — **rendu isolé**, session et API simulées |
| `npm run build` | ✅ Vite + `tsc` |
| Fonction SQL `gestion_iso6346_valid` | ✅ `CSQU3054383` et `MSCU1234566` valides ; `CSQU3054384` refusé ; espaces/minuscules acceptés puis normalisés |
| Test transactionnel base (rôle admin) | ✅ deux 20 acceptés, un 40 accepté, deux 20 avec un seul numéro refusé par la contrainte différée, au moins une entrée d’audit `trip_containers` ; **transaction annulée**, aucune fixture conservée |
| RLS inspectée | ✅ 2 policies `trip_containers`, role `authenticated` ; RPC et validation différée présentes |
| Recette navigateur authentifiée réelle | ❌ non exécutable ici (Supabase inaccessible depuis le sandbox) ; les captures et tests navigateur utilisent une session simulée |

**Ce qui n’est pas revendiqué** : le parcours navigateur réel connecté à Supabase, les mutations réelles via l’API Express, et les cas manager/opérateur/chauffeur sur `trip_containers` n’ont pas été rejoués sur la base distante. Le test transactionnel a utilisé le rôle **admin** ; les policies manager/opérateur/chauffeur ont été inspectées et la matrice de droits reste testée par `backend/tests/accessMatrix.test.ts`, mais leur exécution SQL réelle reste à faire lors de la recette finale.

### 8.4 Écarts restants après cette passe

1. Recette authentifiée réelle et test SQL des quatre rôles (admin, manager, opérateur, chauffeur) sur `trip_containers`.
2. Les agrégats du dashboard restent calculés en JS ; la colonne conteneurs n’y change rien.
3. Les filtres `FiltersBar` restent partiellement appliqués ; les sélecteurs de formulaire n’ont pas tous un état de chargement propre (le formulaire voyage désactive l’enregistrement tant que les références manquent).
4. Les numéros de conteneurs ne sont pas encore dans la recherche globale `q` (la recherche porte sur les colonnes du voyage). À décider avec le propriétaire.
5. Réconciliation des versions de migrations antérieures (inchangée, voir §5.8).
