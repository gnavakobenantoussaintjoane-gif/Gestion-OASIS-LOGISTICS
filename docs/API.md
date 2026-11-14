# API REST — /api

JSON UTF-8, cookies HttpOnly, même origine que le frontend. Toutes les mutations doivent envoyer `X-Gestion-Client: web` et `Content-Type: application/json` (sauf multipart des justificatifs). Les erreurs sont `{error, details?}` avec codes HTTP 400/401/403/404/409/422/428/429/502/503. Les champs non autorisés sont retirés par les schémas Zod ; une mutation sans champ valide est rejetée.

## Authentification

| Méthode / route       | Entrée / effet                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| POST `/auth/register` | fermée dans l’installation privée OASIS LOGISTICS                           |
| POST `/auth/login`    | email ou téléphone, password ; cookies de session                           |
| POST `/auth/forgot-password` | email ; envoi du lien de récupération Supabase                       |
| POST `/auth/google`   | démarre le flux OAuth Google PKCE ; renvoie l’URL de consentement           |
| POST `/auth/callback` | échange le code PKCE ; cookies de session                                   |
| POST `/auth/recovery/password` | nouveau mot de passe après lien de récupération                     |
| GET `/auth/session`   | user, profile, role, company et `isSuperAdmin` (sans jeton)                 |
| POST `/auth/logout`   | révoque la session courante et efface les cookies                           |
| POST `/auth/password` | current_password, password ; réauthentification puis déconnexion            |
| POST `/auth/company`  | fermée dans l’installation privée ; aucune création d’entreprise            |

## Ressources

Liste fermée : `trucks`, `drivers`, `trips`, `expenses`, `tariff_rules`, `terminals`, `container_types`, `expense_categories`.

- GET `/:resource` → `{rows,total,page,limit}`
- GET `/:resource/:uuid` → objet autorisé
- POST `/:resource` → objet créé, 201
- PATCH `/:resource/:uuid` → objet modifié
- DELETE `/:resource/:uuid` → `{ok:true}` ; pour un camion, archivage plutôt que suppression physique

Les schémas de champs sont définis dans `backend/src/validators/resources.ts`. `company_id`, `created_by`, les prix historiques et les champs calculés ne sont pas acceptés du client. Un voyage exige un `tariff_rule_id` actif correspondant. `occurred_at` est un ISO 8601 avec fuseau ; le frontend utilise l’heure d’Abidjan, UTC+0.

### Conteneurs d’un voyage

Un voyage porte **soit deux conteneurs 20 pieds, soit un conteneur 40 pieds** (sec ou reefer selon le type actif). Le client envoie :

```json
{
  "truck_id": "…",
  "driver_id": "…",
  "occurred_at": "2026-11-14T08:00:00Z",
  "terminal_id": "…",
  "container_type_id": "…",
  "load": "Plein",
  "tariff_rule_id": "…",
  "containers": [
    { "number": "CSQU3054383", "size": 20 },
    { "number": "MSCU1234566", "size": 20 }
  ]
}
```

- `containers` est obligatoire à la création, facultatif au PATCH ; s’il est fourni, il **remplace** l’ensemble des conteneurs du voyage.
- `number` est normalisé en majuscules sans espaces et vérifié **ISO 6346** (clé de contrôle incluse) ; `size` vaut `20` ou `40`.
- Le type `container_type_id` doit être un type actif de l’entreprise dont le `kind` correspond à la taille (`20_DRY` pour deux 20, `40_DRY`/`40_REEFER` pour un 40). L’API renvoie `422` avec un message explicite sinon, ainsi que pour un doublon ou un mélange de tailles.
- La réponse d’un voyage inclut `trip_containers: [{ id, number, size, created_at, created_by }]` ; `GET /trips` et `GET /dashboard` la renvoient aussi.
- `DELETE /trips/:uuid` supprime les conteneurs par cascade ; `PATCH` d’un conteneur est audité (`CONTAINER_ADDED`, `CONTAINER_UPDATED`, `CONTAINER_REMOVED`).

`GET /trips/:uuid/containers/history` (admin/gestionnaire) renvoie les 100 dernières entrées d’audit de type conteneur pour ce voyage : `{ id, action, created_at, user_id, old_data, new_data }`. Un opérateur peut lire ses voyages mais pas cet historique ; le frontend ne l’affiche donc qu’aux rôles admin/gestionnaire.

Les exports Excel/PDF comportent une feuille **Voyages** avec les colonnes `Conteneurs` (numéros triés, séparés par ` + `) et `Nb conteneurs`.

### Filtres des listes, dashboard et rapports

`start`, `end` (dates inclusives), `truck_id`, `driver_id`, `shift` (`day/night`), `terminal_id`, `container_type_id`, `load` (`Plein/Vide`), `category_id`, `min`, `max`, `q`, `page` (≥1), `limit` (1–100), `sort`, `order` (`asc/desc`). Seuls les filtres qui existent sur la ressource sont appliqués ; les clés de tri sont limitées à une liste blanche.

## Autres routes

| Méthode / route                       | Usage                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| GET `/health`                         | santé du processus, pas un test de connexion à la base                   |
| GET `/reference-data`                 | références autorisées de l’entreprise                                    |
| GET `/dashboard`                      | opérations filtrées + totaux exacts, admin/gestionnaire                  |
| GET `/reports/xlsx` ou `/reports/pdf` | fichiers filtrés, admin/gestionnaire                                     |
| GET `/members`                        | membres et rôles de l’entreprise, admin/gestionnaire                     |
| POST `/members`                       | member_email, member_name, member_role ; **super administrateur**, compte confirmé existant |
| POST `/members/accounts`              | member_email, member_name, member_role, password ; **super administrateur**, crée le compte Auth |
| PATCH `/company`                      | name, phone, address ; admin                                             |
| PATCH `/profile`                      | full_name, phone ; son profil uniquement                                 |
| GET `/notifications`                  | 100 derniers événements personnels                                       |
| PATCH `/notifications/:uuid/read`     | marque une notification personnelle lue                                  |
| GET `/audit-logs`                     | 100 dernières écritures de l’entreprise, admin/gestionnaire              |
| GET `/trips/:uuid/containers/history` | historique d’audit des conteneurs d’un voyage, admin/gestionnaire       |
| POST `/expenses/:uuid/receipt`        | multipart `file`, admin/gestionnaire                                     |
| GET `/expenses/:uuid/receipt`         | `{url}` signée 60 secondes                                               |

Les totaux monétaires sont renvoyés comme chaînes décimales (`"110000"`) pour conserver la précision. Les montants unitaires restent des entiers sûrs. Le comptage des recettes repose sur une ligne par voyage, jamais sur une multiplication redondante.
