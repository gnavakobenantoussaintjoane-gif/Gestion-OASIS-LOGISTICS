# API REST — /api

JSON UTF-8, cookies HttpOnly, même origine que le frontend. Toutes les mutations doivent envoyer `X-Gestion-Client: web` et `Content-Type: application/json` (sauf multipart des justificatifs). Les erreurs sont `{error, details?}` avec codes HTTP 400/401/403/404/409/422/428/429/502/503. Les champs non autorisés sont retirés par les schémas Zod ; une mutation sans champ valide est rejetée.

## Authentification

| Méthode / route       | Entrée / effet                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| POST `/auth/register` | email, password (12–128 caractères), confirmation selon Supabase            |
| POST `/auth/login`    | email, password ; cookies de session                                        |
| GET `/auth/session`   | user, profile, role et company (sans jeton)                                 |
| POST `/auth/logout`   | révoque la session courante et efface les cookies                           |
| POST `/auth/password` | current_password, password ; réauthentification puis déconnexion            |
| POST `/auth/company`  | company_name, display_name ; crée atomiquement entreprise et administrateur |

## Ressources

Liste fermée : `trucks`, `drivers`, `trips`, `expenses`, `tariff_rules`, `terminals`, `container_types`, `expense_categories`.

- GET `/:resource` → `{rows,total,page,limit}`
- GET `/:resource/:uuid` → objet autorisé
- POST `/:resource` → objet créé, 201
- PATCH `/:resource/:uuid` → objet modifié
- DELETE `/:resource/:uuid` → `{ok:true}` ; pour un camion, archivage plutôt que suppression physique

Les schémas de champs sont définis dans `backend/src/validators/resources.ts`. `company_id`, `created_by`, les prix historiques et les champs calculés ne sont pas acceptés du client. Un voyage exige un `tariff_rule_id` actif correspondant. `occurred_at` est un ISO 8601 avec fuseau ; le frontend utilise l’heure d’Abidjan, UTC+0.

### Filtres des listes, dashboard et rapports

`start`, `end` (dates inclusives), `truck_id`, `driver_id`, `shift` (`day/night`), `terminal_id`, `container_type_id`, `load` (`Plein/Vide`), `category_id`, `min`, `max`, `q`, `page` (≥1), `limit` (1–100), `sort`, `order` (`asc/desc`). Seuls les filtres qui existent sur la ressource sont appliqués ; les clés de tri sont limitées à une liste blanche.

## Autres routes

| Méthode / route                       | Usage                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| GET `/health`                         | santé du processus, pas un test de connexion à la base                   |
| GET `/reference-data`                 | références autorisées de l’entreprise                                    |
| GET `/dashboard`                      | opérations filtrées + totaux exacts, admin/gestionnaire                  |
| GET `/reports/xlsx` ou `/reports/pdf` | fichiers filtrés, admin/gestionnaire                                     |
| GET `/members`                        | membres et rôles, admin/gestionnaire                                     |
| POST `/members`                       | member_email, member_name, member_role ; admin, compte confirmé existant |
| PATCH `/company`                      | name, phone, address ; admin                                             |
| PATCH `/profile`                      | full_name, phone ; son profil uniquement                                 |
| GET `/notifications`                  | 100 derniers événements personnels                                       |
| PATCH `/notifications/:uuid/read`     | marque une notification personnelle lue                                  |
| GET `/audit-logs`                     | 100 dernières écritures de l’entreprise, admin/gestionnaire              |
| POST `/expenses/:uuid/receipt`        | multipart `file`, admin/gestionnaire                                     |
| GET `/expenses/:uuid/receipt`         | `{url}` signée 60 secondes                                               |

Les totaux monétaires sont renvoyés comme chaînes décimales (`"110000"`) pour conserver la précision. Les montants unitaires restent des entiers sûrs. Le comptage des recettes repose sur une ligne par voyage, jamais sur une multiplication redondante.
