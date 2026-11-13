# Audit technique — GESTION / OASIS LOGISTICS

**Date :** 13 novembre 2026
**Périmètre :** dépôt `Gestion-OASIS-LOGISTICS`, branche `arena/7f2fdded-gestion-oasis-logistics`, commit `1d0f554`
**Méthode :** revue de code statique, exécution de la chaîne de vérification, inspection **en lecture seule** du projet Supabase `nrwfnqtomyamswirrhqv` (schéma, RLS, ACL, configuration Auth, volume de données).

> Cet audit n'est ni un test d'intrusion, ni un test de charge, ni une certification. La recette authentifiée de bout en bout n'a pas pu être rejouée ici : le sandbox refuse les connexions HTTPS vers Supabase (`ECONNRESET`), comme déjà documenté par l'équipe.

---

## 1. Verdict en une page

**Le socle technique est bon — nettement au-dessus de la moyenne des projets de cette taille — mais l'application n'est pas encore exploitable en production.** Les trois raisons principales ne sont pas dans le code métier : la configuration Auth de Supabase n'est pas verrouillée, la recette authentifiée n'a jamais été exécutée, et aucun pipeline CI ne protège les 91 tests existants.

| Axe | Note | Commentaire |
| --- | --- | --- |
| Architecture / modèle de données | 4,5 / 5 | Séparation nette, RLS + FK composites + règles métier en base : rare et solide |
| Sécurité du code applicatif | 4 / 5 | Cookies HttpOnly, anti-CSRF, pas de service-role dans le chemin métier, Zod strict |
| Sécurité de la configuration | **2 / 5** | Inscription publique ouverte, URL de retour `localhost`, SMTP absent, mot de passe à 6 caractères |
| Qualité / lisibilité | 3,5 / 5 | Bon découpage, mais `any`, CSS monolithique, quelques composants trop longs |
| Tests | 3 / 5 | 91 tests qui passent, mais aucune CI, peu d'intégration, zéro E2E authentifié |
| Performance / base | 2,5 / 5 | Dashboard qui renvoie jusqu'à 100 000 lignes au navigateur, index manquants sur les FK |
| Exploitation / production | **2 / 5** | Pas de CI, pas de logs structurés, rate-limit in-memory, propriétaire unique |
| Documentation | 3 / 5 | Très riche, mais en décalage avec l'état réel (compteurs de tests, routes fermées) |

**Conclusion :** bon produit interne en fin de construction. Avant une mise en service, traiter les points **P0** ci-dessous (≈ 2 à 3 jours de travail), puis les **P1** (≈ 1 à 2 semaines). Les **P2** sont de la dette à programmer sans urgence.

---

## 2. Ce qui est solide (à ne pas casser)

Ces choix sont bons et souvent mal faits ailleurs ; ils doivent être préservés lors des prochaines évolutions.

1. **La sécurité est dans la base, pas seulement dans l'API.** Toutes les tables du schéma `public` ont `RLS = true` (18/18 vérifiées en base), les relations inter-entreprises passent par des **clés étrangères composites** `(company_id, id)`, et les règles métier (shifts, tarifs, disponibilité camion/chauffeur, doublons) sont des triggers PostgreSQL. Même un appel direct à PostgREST avec le JWT d'un utilisateur reste contraint.
2. **Aucune clé service-role dans le chemin métier.** `backend/src/config/supabase.ts` crée un client par requête avec le jeton utilisateur + clé publiable ; la clé administrative est isolée dans `adminSupabase.ts` et réservée à la création de comptes. Le frontend ne contient aucune clé Supabase.
3. **Sessions correctement protégées.** Cookies `HttpOnly`, `SameSite=Lax`, `Secure` en production, `path=/api`, jamais de jeton dans `localStorage` (`backend/src/services/session.ts:10-21`). Rafraîchissement mutualisé pour éviter les courses sur la rotation (`middlewares/auth.ts:8-30`).
4. **Anti-CSRF en profondeur.** En-tête applicatif `X-Gestion-Client` obligatoire sur toute mutation + contrôle d'`Origin` + cookies `SameSite` (`backend/src/app.ts:30-48`). C'est le bon modèle pour une API JSON same-origin.
5. **Validation stricte.** Schémas Zod en liste blanche (`validators/resources.ts`), aucun `company_id`/`created_by`/prix accepté du client, tri limité à une liste blanche, recherche `ilike` assainie.
6. **Gestion documentaire propre.** Bucket privé, contrôle des magic bytes PDF/JPEG/PNG, 5 Mo max, nom aléatoire, URL signée 60 s en téléchargement forcé, suppression de l'ancien fichier (`routes/api.ts:220-300`).
7. **Industrialisation de base présente :** workspaces npm, `package-lock.json`, `npm ci` reproductible, TypeScript strict, ESLint, Vitest, builds de production.
8. **Honnêteté documentaire.** Les limites (réseau Supabase, absence de recette authentifiée, modules non livrés) sont écrites noir sur blanc dans `README.md` et `docs/ETAT-DU-PROJET.md`. C'est un point fort réel.

---

## 3. Constats détaillés

### 3.1 Bloquants avant mise en production (P0)

#### P0-1 — La configuration Supabase Auth n'est pas verrouillée

**Constat (relevé en base le 13/11/2026) :**

| Paramètre | Valeur actuelle | Attendu |
| --- | --- | --- |
| `disable_signup` | `false` | `true` (installation privée) |
| `site_url` | `http://localhost:3000` | URL HTTPS de production |
| `uri_allow_list` | *(vide)* | `https://…/auth/callback, https://…/auth/reset-password` |
| `smtp_host` | `null` | SMTP transactionnel |
| `rate_limit_email_sent` | `2` / heure | ≥ 30 / heure |
| `password_min_length` | `6` | `12` |
| `password_hibp_enabled` | `false` | `true` |
| `sessions_timebox` / `sessions_inactivity_timeout` | `0` / `0` | 8 h / 30 min |
| `external_phone_enabled` | `false` | activé **ou** onglet retiré de l'UI |
| `external_google_enabled` | `false` | configuré **ou** bouton retiré de l'UI |

**Preuves :** configuration Auth du projet ; `frontend/src/pages/Login.tsx:166` (onglet Téléphone) et `:325` (« Continuer avec Google »).
**Impact :**
- N'importe qui disposant de la clé publiable peut créer un compte via l'API Auth (pas d'accès métier, mais pollution, quota e-mail et surface d'attaque).
- La réinitialisation de mot de passe — pourtant implémentée (`authFlows.ts`) — est inutilisable : e-mails limités à 2/h et lien pointant vers `localhost`.
- La politique « 12 caractères » du backend est contournable : un appel direct à Supabase Auth accepte 6 caractères.
- L'interface propose deux modes de connexion qui échoueront systématiquement (téléphone, Google) → tickets de support garantis.

**Correctif :** verrouiller ces paramètres, puis retirer de l'UI les fournisseurs non configurés. Documenter la procédure dans `docs/INSTALLATION.md`.

#### P0-2 — La recette authentifiée n'a jamais été exécutée

**Constat :** en base, 1 utilisateur Auth, 1 entreprise, 1 profil, 1 rôle, 1 super administrateur et **0 voyage, 0 dépense, 0 camion, 0 chauffeur, 0 tarif**. Le sandbox renvoie `ECONNRESET` vers Supabase. Les tests backend simulent Auth.
**Impact :** personne n'a prouvé que le parcours réel « login → cookie → session → dashboard → création d'un voyage → export » fonctionne. C'est le risque projet n°1 : les défauts d'intégration apparaissent au moment de la mise en service.
**Correctif :** exécuter la checklist de la section 6 depuis une machine autorisée, avec un compte de recette, puis consigner les captures et les identifiants d'opérations créées.

#### P0-3 — Aucune intégration continue

**Constat :** pas de dossier `.github/` (donc pas de workflow), pas de rapport de couverture, tests SQL exécutés manuellement. Les 91 tests, le lint, le typecheck et le build ne sont déclenchés par rien.
**Impact :** la première régression passera en production silencieusement ; le niveau de qualité repose sur la discipline individuelle.
**Correctif :** workflow GitHub Actions (exemple en annexe C) sur `push` et `pull_request` : `npm ci`, `lint`, `typecheck`, `test`, `build`, `npm audit --audit-level=high`. Ajouter les tests SQL sur une base éphémère, puis Playwright.

#### P0-4 — Un seul propriétaire, avec son adresse e-mail codée en dur

**Constat :** `public.oasis_super_admin` impose un singleton (`singleton boolean … UNIQUE`), et `oasis_bootstrap_owner` vérifie `lower(email)='gnavakobenan@gmail.com'` (`supabase/migrations/20261111220000_oasis_super_admin.sql:27-59`). Seul ce compte peut créer/rattacher des membres (`gestion_set_member`).
**Impact :** facteur de bus = 1. Départ, perte d'accès ou changement d'adresse du propriétaire ⇒ plus personne ne peut administrer les comptes sans écrire une migration. L'adresse personnelle est aussi exposée dans le dépôt.
**Correctif :** rendre le propriétaire transférable (table `oasis_owners` multi-lignes, ou colonne `is_owner` + procédure de transfert auditée), supprimer la fonction de bootstrap une fois le provisioning fait, et documenter la rotation.

---

### 3.2 Sécurité et robustesse (P1)

#### P1-1 — Limitation de débit inopérante derrière un proxy ou en multi-instances
`app.set("trust proxy", false)` (`backend/src/app.ts:14`) et stores mémoire (`app.ts:20-27`, `routes/auth.ts:13-19`). Derrière un reverse proxy (cas nominal : Nginx/Caddy → Express sur la même origine), **toutes les requêtes portent l'IP du proxy** : le quota de 250 req/min et celui de 40 tentatives/15 min deviennent globaux. En multi-instances, chaque instance a son propre compteur.
**Correctif :** `trust proxy` = nombre de sauts de confiance, store partagé (Redis/Upstash) en production, et clé de limitation `userId` pour les routes authentifiées. À défaut, documenter explicitement le déploiement mono-instance.

#### P1-2 — Sessions trop longues et absence de MFA
Cookie de rafraîchissement 30 jours (`services/session.ts:19`), aucune timebox Supabase, pas de MFA dans l'application alors que le projet Supabase a TOTP activé. Les comptes à privilèges (admin, super admin) sont les plus exposés.
**Correctif :** timebox 8 h, inactivité 30 min, MFA TOTP obligatoire pour `admin` et `super admin`, journalisation des connexions.

#### P1-3 — Le dashboard renvoie les lignes brutes, pas des agrégats
`GET /api/dashboard` (`routes/api.ts:56-58`) appelle `reportData`, qui charge **jusqu'à 100 000 voyages + 100 000 dépenses + tous les camions** et renvoie ces tableaux au navigateur (`services/resources.ts:113-145`). Les graphiques sont calculés côté client.
**Impact :** temps de réponse et mémoire serveur proportionnels à l'historique ; payload de plusieurs mégaoctets sur mobile dès quelques milliers de lignes ; coût Supabase élevé ; un utilisateur peut déclencher jusqu'à 3 × 100 requêtes paginées par affichage du dashboard.
**Correctif :** fonction SQL d'agrégation (`sum`, `count`, `group by accounting_date/shift/terminal`) exposée en RPC, totaux renvoyés en `text`, et listes paginées séparées. Garder `reportData` uniquement pour l'export, avec un plafond explicite et un traitement asynchrone au-delà.

#### P1-4 — Exports synchrones et fragilité au démarrage
`services/exports.ts:6` lit le logo avec `readFileSync` **au chargement du module** : si `shared/branding/otl-logo.jpg` n'accompagne pas le déploiement, le processus Express ne démarre pas (erreur non expliquée). Les exports génèrent ensuite tout en mémoire, sur le même chemin que le dashboard.
**Correctif :** lecture paresseuse avec repli et message clair, ou logo embarqué ; limite de volume ; export asynchrone (job + lien signé) au-delà de quelques milliers de lignes.

#### P1-5 — Cycle de vie des comptes incomplet
- Un compte est créé par le super admin **avec un mot de passe choisi par lui** (`routes/api.ts:121-160`, `Settings.tsx:300-360`) : le mot de passe transite dans une requête et doit être communiqué « par un canal sûr ».
- Aucune obligation de changement à la première connexion.
- Aucun endpoint de désactivation/suppression : le départ d'un salarié ne peut pas être traité proprement (au mieux un changement de rôle en `driver`, qui garde l'accès).
**Correctif :** invitation par e-mail (flux Supabase), ou mot de passe aléatoire + `must_change_password` appliqué côté API/DB, et désactivation/révocation des sessions.

#### P1-6 — La garantie d'exactitude des montants est théorique
`financialTotals` utilise `BigInt` (`backend/src/utils/finance.ts:4-12`), mais les `bigint` PostgreSQL arrivent dans le JSON de PostgREST sous forme de **nombres JavaScript**, donc déjà convertis en `double`. Au-delà de 2⁵³ (≈ 9 007 milliards FCFA cumulés), `BigInt(t.price)` fige une valeur arrondie. En pratique le seuil est loin, mais l'affirmation « totaux exacts BigInt » n'est vraie qu'en deçà.
**Correctif :** calculer les totaux en SQL (`sum(price)` renvoyé en `text`) ou exposer les montants en `text` via une vue/RPC.

#### P1-7 — Index manquants sur les chemins chauds
Vérifié en base : aucun index sur `expenses(company_id, trip_id)`, `trips(company_id, driver_id)`, `trips(company_id, terminal_id)`, `trips(company_id, container_type_id)`.
**Impact :** `gestion_sync_trip_expenses` scanne toutes les dépenses de l'entreprise à chaque modification de voyage ; les filtres chauffeur/terminal/conteneur et la politique `trips_read` font des parcours complets.
**Correctif :** migration d'index (annexe C). Ajouter `pg_trgm` + index GIN si la recherche `ilike` devient fréquente sur `trips.reference`/`observations`.

#### P1-8 — Notifications et audit peu exploitables, données personnelles non bornées
Chaque écriture crée une notification **pour son propre auteur** (`gestion_audit`), et `audit_logs` conserve la ligne complète (téléphone, n° de permis, montants) sans politique de rétention. Les notifications métier attendues (seuil de dépense, tarif manquant, permis expirant) n'existent pas.
**Correctif :** notifications événementielles ciblées + rétention/archivage des audits (12–24 mois) et exclusion des colonnes sensibles.

---

### 3.3 Qualité, performance et dette (P2)

| # | Constat | Preuve | Correctif |
| --- | --- | --- | --- |
| P2-1 | Pas de types générés depuis le schéma : 11 `any` explicites, dont 8 dans `exports.ts` | `grep ": any" backend/src frontend/src` | `supabase gen types` + typage des clients |
| P2-2 | 5 130 lignes de CSS artisanal, Tailwind importé mais quasi inutilisé | `assets/styles.css` (3 732 l.) | migrer progressivement vers des composants/utilitaires, découper par écran |
| P2-3 | Composants trop longs | `ResourcePage.tsx` 459 l., `Dashboard.tsx` 484 l., `Settings.tsx` 393 l. | extraire hooks et sous-composants |
| P2-4 | Pas d'`ErrorBoundary` global : un crash de rendu = écran blanc | `main.tsx`, `routes/App.tsx` | ajouter une barrière + écran de reprise |
| P2-5 | Actions destructives via `window.confirm`, sans annulation | `ResourcePage.tsx:90-110` | modale de confirmation typée, `toast` avec action |
| P2-6 | Bundle lourd | `TruckScene` 901 kB (244 kB gzip), `index` 534 kB | limiter le 3D au desktop, `manualChunks`, vérifier le budget mobile |
| P2-7 | Aucun log structuré, request-id, métrique ni alerte ; `/api/health` ne teste pas la base | `app.ts:51-54`, `server.ts` | Pino + request-id, healthcheck DB, Sentry/OTel |
| P2-8 | `shift_definitions` est une table de configuration **non utilisée** : les horaires sont codés en dur dans les triggers | migration `20261111180000` | soit brancher les triggers sur la table (avec versionnement), soit documenter qu'elle est décorative |
| P2-9 | Une date de dépense n'est pas contrôlée par rapport à la date comptable du voyage lié | trigger `gestion_prepare_expense` | ajouter une contrainte si la règle métier le justifie |
| P2-10 | `drivers.user_id` n'est pas unique : un compte peut être lié à plusieurs chauffeurs | schéma `drivers` | index unique partiel si la règle « 1 compte = 1 chauffeur » est vraie |
| P2-11 | Table `companies.logo_path` présente mais aucun upload ni usage dans les rapports | `exports.ts` (logo OTL fixe) | fonctionnalité à cadrer ou colonne à retirer |
| P2-12 | Tables `legacy_*` conservées avec droits `authenticated` | base (3 tables, 0 ligne) + migration 1 | les supprimer pour réduire la surface |
| P2-13 | Tests manquants sur les points sensibles : filtres/tri/pagination (`queryResource`), exports volumineux, CRUD front | `backend/tests`, `frontend/tests` | ajouter des tests unitaires + un E2E authentifié |
| P2-14 | Aucune couverture mesurée, aucun seuil | configs Vitest | `coverage` + seuil progressif (60 % puis 75 %) |
| P2-15 | Pas de `engines`/`.nvmrc` alors que Node 22.22+ est requis | `package.json` | figer la version, ajouter Dockerfile multi-stage |
| P2-16 | Aucune politique de sauvegarde/restauration documentée | `docs/INSTALLATION.md` | runbook PITR + test de restauration |

---

## 4. Revue de sécurité — ce qui tient, ce qui manque

| Contrôle | État | Détail |
| --- | --- | --- |
| Isolation multi-entreprises (RLS) | ✅ | 18/18 tables avec RLS, 38 politiques, `oasis_super_admin` sans aucun grant |
| Références inter-entreprises | ✅ | FK composites `(company_id, id)` sur toutes les relations |
| Élévation de privilèges par métadonnées | ✅ | Rôles en base uniquement, `gestion_set_member` en `SECURITY DEFINER` avec `search_path=''` |
| IDOR | ✅ | Chaque lecture/écriture filtre `company_id` + RLS |
| CSRF | ✅ | En-tête applicatif + `Origin` + `SameSite=Lax` |
| XSS | ✅ | Aucun `dangerouslySetInnerHTML`/`innerHTML`/`eval` ; React échappe |
| Fuite de secrets | ✅ | Pas de service-role dans le frontend, pas de `.env` versionné |
| Upload de fichiers | ✅ | Magic bytes, taille, bucket privé, URL signée courte |
| Erreurs | ✅ | Pas de détail SQL/jeton renvoyé ; codes 4xx/5xx maîtrisés |
| Politique de mot de passe | ⚠️ | 12 caractères côté API, **6 côté Supabase** (contournable), HIBP désactivé |
| Anti-bruteforce | ⚠️ | Par IP uniquement, store mémoire, pas de verrouillage par compte |
| MFA | ❌ | Disponible sur le projet, non implémenté dans l'app |
| En-têtes de sécurité du frontend | ⚠️ | `helmet` couvre l'API ; le statique (CSP, HSTS, `Referrer-Policy`) n'est pas défini dans le dépôt |
| Journalisation de sécurité | ⚠️ | Audit métier présent ; pas de journal de connexions/échecs exploitable |
| Gestion des secrets de déploiement | ⚠️ | Correcte localement ; à formaliser (gestionnaire de secrets, rotation) |

**Point d'attention CSRF :** le contrôle actuel est solide pour une API JSON same-origin. Il ne faut pas le remplacer par un jeton CSRF « parce que c'est la mode », mais conserver les trois couches et documenter que le déploiement doit rester sur **une seule origine** (frontend et `/api`).

---

## 5. Documentation : un décalage à corriger avant la transmission

| Document | Affirmation | Réalité |
| --- | --- | --- |
| `README.md:52` | « Créer son compte depuis l'écran de connexion » | L'inscription est fermée (`/auth/register` → 403), aucun formulaire d'inscription |
| `docs/API.md:9` | `POST /auth/register` documenté comme disponible | Retourne systématiquement 403 |
| `docs/API.md:14` | `POST /auth/company` documenté | Retourne systématiquement 403 |
| `docs/ETAT-DU-PROJET.md:7`, `LOGIN-3D.md:43`, `OTL-REFONTE.md:53` | « 84 tests », « 88 tests », « 59 backend / 25 frontend » | **91 tests** (59 backend + 32 frontend) |
| `docs/ETAT-DU-PROJET.md:68` | « le projet ne doit pas être annoncé prêt pour la production » | Toujours vrai ; la liste des bloquants a évolué |

**Correctif :** mettre à jour les compteurs, marquer les routes fermées comme `410/403 — désactivé`, et faire de `docs/ETAT-DU-PROJET.md` la source unique de vérité avec une date de dernière vérification.

---

## 6. Check-list de recette avant production

À exécuter depuis un environnement autorisé à joindre Supabase, avec un compte de recette dédié (pas le compte propriétaire).

1. **Auth** — connexion e-mail/mot de passe, mauvais mot de passe, compte non confirmé, déconnexion, rafraîchissement après 1 h, changement de mot de passe (vérifier la révocation des autres sessions).
2. **Rôles** — parcours complets `admin`, `manager`, `operator`, `driver` : ce que chacun voit, peut créer, modifier, supprimer ; vérifier les 403 attendus.
3. **Métier** — créer un tarif, un camion, un chauffeur, un voyage à 06:00, 18:30, 18:45 (refus), 19:00, 02:00 (date de la veille) ; vérifier le prix figé après modification du tarif ; doublon refusé.
4. **Dépenses** — dépense liée à un voyage (camion/chauffeur/shift recopiés), justificatif PDF puis JPEG, téléchargement signé, remplacement, suppression du voyage (dépense conservée, lien retiré).
5. **Dashboard / exports** — filtres combinés (période, terminal, conteneur, shift, montant), cohérence des totaux avec un calcul manuel, export Excel et PDF avec logo.
6. **Sécurité** — appel direct à PostgREST avec le JWT d'un opérateur pour lire `expenses` (doit renvoyer 0 ligne ou une erreur) ; accès anonyme ; tentative d'écriture sans `X-Gestion-Client`.
7. **Résilience** — coupure réseau Supabase simulée : message 503 (pas 401), session conservée, reprise après retour réseau.
8. **Mobile** — 390 px et 320 px, clavier, modales, thème sombre.

Consigner pour chaque point : date, exécutant, résultat, capture ou identifiant d'objet créé.

---

## 7. Plan d'action priorisé

| Priorité | Action | Effort | Impact |
| --- | --- | --- | --- |
| **P0** | Verrouiller la configuration Auth (10 paramètres du §3.1) | 1 h | Supprime inscription publique, reset cassé, politique 6 caractères |
| **P0** | Exécuter la checklist de recette authentifiée | 1 j | Prouve que le produit fonctionne réellement |
| **P0** | Ajouter le workflow CI + seuil de couverture | 0,5 j | Protège les 91 tests existants |
| **P0** | Rendre le propriétaire transférable, retirer l'e-mail codé en dur | 0,5 j | Supprime le facteur de bus |
| **P1** | Agréger le dashboard en SQL + paginer les listes | 3 j | Divise par 10–100 le payload et la latence |
| **P1** | Index de performance (annexe C) | 0,5 j | Supprime les parcours complets |
| **P1** | `trust proxy` + store de rate-limit partagé | 0,5 j | Rend l'anti-bruteforce réellement efficace |
| **P1** | Timebox de session + MFA pour les admins | 2 j | Réduit le risque de compromission |
| **P1** | Cycle de vie des comptes (invitation, changement forcé, désactivation) | 2 j | Conformité RH et sécurité |
| **P1** | Totaux exacts via SQL (`sum(...)::text`) | 0,5 j | Rend la garantie comptable vraie |
| **P2** | Types générés, ErrorBoundary, logs, CSS, tests manquants, Docker, sauvegardes | 5–8 j | Dette maîtrisée |

---

## Annexe A — Vérifications exécutées

| Commande | Résultat |
| --- | --- |
| `npm ci` | 704 paquets installés, aucune erreur |
| `npm run typecheck` | ✅ backend + frontend |
| `npm run lint` | ✅ aucune erreur |
| `npm test` | ✅ **91 tests** (59 backend, 32 frontend), 0 échec |
| `npm run build` | ✅ `backend/dist` + `frontend/dist` (3 594 modules) |
| `npm audit` | 0 vulnérabilité (contrôle du 13/11/2026, indicatif) |
| `npm run test:e2e` | Non exécuté (nécessite navigateurs + serveurs démarrés) |
| Accès HTTPS Supabase depuis le sandbox | ❌ `ECONNRESET` — recette authentifiée impossible ici |

---

## Annexe B — État Supabase constaté (lecture seule)

- **Migrations appliquées :** 6/6 (`create_oasis_database`, `gestion_saas`, `gestion_hardening`, `gestion_operation_guards`, `oasis_private_access`, `oasis_super_admin`).
- **Tables :** 18 dans `public` (15 applicatives + 3 `legacy_*`), **RLS activée sur 18/18**.
- **Politiques :** 38.
- **Fonctions :** 14, dont 10 `SECURITY DEFINER` avec `search_path` fixé ; seule `rls_auto_enable` (événementielle, fournie par Supabase, `search_path=pg_catalog`) est exécutable par `PUBLIC`.
- **Données :** 1 utilisateur Auth, 1 entreprise, 1 profil, 1 rôle, 1 super admin, **0 opération métier**.
- **Storage :** bucket privé `gestion-receipts` (5 Mo, 3 MIME autorisés) avec 3 politiques par entreprise + rôle.

---

## Annexe C — Correctifs prêts à l'emploi

### C.1 Index de performance

```sql
-- À appliquer via une migration versionnée, après mesure EXPLAIN.
create index if not exists trips_company_driver
  on public.trips (company_id, driver_id);
create index if not exists trips_company_terminal
  on public.trips (company_id, terminal_id);
create index if not exists trips_company_container
  on public.trips (company_id, container_type_id);
create index if not exists expenses_company_trip
  on public.expenses (company_id, trip_id);
```

### C.2 Workflow CI minimal

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npm audit --audit-level=high
```

### C.3 Téléchargement sûr du logo

```ts
// services/exports.ts — éviter le crash au démarrage
import { HttpError } from "../utils/errors.js";

let cachedLogo: Buffer | null = null;
function logo(): Buffer {
  if (cachedLogo) return cachedLogo;
  try {
    cachedLogo = readFileSync(
      new URL("../../../shared/branding/otl-logo.jpg", import.meta.url),
    );
    return cachedLogo;
  } catch {
    throw new HttpError(
      503,
      "Le logo des rapports est absent du déploiement (shared/branding).",
    );
  }
}
```

### C.4 Limitation de débit par utilisateur

```ts
// après authenticate : clé stable par compte, pas par IP
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 250,
    // En express-rate-limit v8, normaliser les IPv6 via son helper ipKeyGenerator.
    keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
    store: productionStore(), // Redis / Upstash
  }),
);
```

---

*Rapport généré après revue du code et inspection en lecture seule de la base. Aucune modification n'a été apportée au code, aux migrations ni aux données pendant cet audit.*
