# Nouvelle connexion Gestion — intégration ciblée

## Diagnostic et périmètre

Le dépôt conserve ses workspaces `frontend` (React 19/TypeScript/Vite) et `backend` (Express/TypeScript), React Router, le contexte de session et l’API REST `/api`. Le seul client Supabase métier existant est la fabrique backend `src/config/supabase.ts`. Le navigateur n’a pas de client Supabase, et reçoit uniquement les cookies de session httpOnly, pas les tokens.

L’ancienne connexion avait une animation de camion latérale, des styles globaux accumulés et seulement le login email/mot de passe. Aucun callback OAuth ou écran de récupération n’existait. La nouvelle page est une intégration, pas une reconstruction de l’application.

**Aucun changement des tables, migrations, RLS, rôles, pages dashboard, styles globaux, variables/fichiers d’environnement existants ou dépendances.** Tous les composants précédents, dont les animations, sont conservés. `LoginTruckAnimation` n’est simplement plus utilisé par la connexion. Les animations dashboard/chargement continuent d’exister.

## Présentation

- Thème clair local permanent, indépendant du thème mémorisé du dashboard.
- Identité GESTION / FLEET MANAGEMENT, présentation et illustration **fixe** réutilisant le SVG existant OASIS LOGISTICS à gauche.
- Formulaire à droite ; en mobile, identité réduite puis formulaire, sans illustration volumineuse.
- Fond décoratif CSS/SVG **uniquement en bas** : routes, ligne lumineuse bleue, particules et dégradé. Pas de camion animé sur la connexion, pas de canvas/WebGL.
- Préférence globale d’animations et `prefers-reduced-motion` respectées ; couche décorative non interactive, sous le contenu.
- Labels associés, contrôles clavier, bascule du mot de passe, erreurs françaises et doubles soumissions verrouillées. Pas de case « Se souvenir de moi » ajoutée : la politique des cookies existants n’a pas été changée.

## Authentification réellement câblée

- `POST /api/auth/login` accepte **soit** `email`, **soit** `phone` E.164, avec `password`. L’API transmet les paramètres tels quels à `signInWithPassword`. Aucun numéro n’est transformé en email.
- `POST /api/auth/google` appelle `signInWithOAuth` avec Google et un retour `${origin}/auth/callback`. L’origine vient du header navigateur déjà validé par la protection d’origine existante. Le navigateur suit ensuite l’URL officielle retournée.
- `POST /api/auth/forgot-password` appelle `resetPasswordForEmail` avec `${origin}/auth/reset-password`. La réponse reste neutre sur l’existence du compte. Pas de récupération par SMS annoncée.
- `POST /api/auth/callback` échange le code PKCE via le SDK existant. Le verifier est conservé dans un cookie httpOnly temporaire, pas dans localStorage. La fabrique existante reçoit seulement une option de stockage PKCE isolé ; le comportement des autres clients reste inchangé. Les emplacements PKCE multiples de la version du SDK installée sont conservés.
- Les callbacks sont traités par le routeur **avant** sa barrière de session pour fonctionner avec ou sans session existante. Les codes sont retirés de la barre d’adresse après lecture. Les échanges sont protégés contre les doubles effets React StrictMode.
- Le retour Google réutilise les cookies habituels, puis `/api/auth/session` et le contexte existant vérifient profil, entreprise autorisée et rôle. Aucune élévation de privilège, aucune inscription applicative ouverte.
- La récupération utilise des cookies séparés et limités au chemin `/api/auth/recovery`, sans donner accès aux routes métier. `POST /api/auth/recovery/password` restaure la session de récupération, change le mot de passe et tente la révocation globale. Le formulaire confirme le nouveau mot de passe (12 à 128 caractères). Si la révocation distante échoue après mise à jour, l’interface l’indique sans prétendre le contraire.

## Configuration externe à vérifier (non modifiée)

1. **Email** : compte Auth existant, mot de passe et confirmation selon les règles du projet.
2. **Téléphone** : activer l’authentification téléphone dans Supabase, disposer de comptes Auth avec numéro international confirmé et mot de passe, ainsi que du rattachement métier existant. Ce formulaire ne crée pas de comptes téléphone, ne confirme pas de SMS et ne configure pas de fournisseur SMS.
3. **Google** : activer le fournisseur dans Supabase Auth et renseigner les identifiants OAuth Google Cloud. Dans Google Cloud, autoriser le callback Auth fourni par Supabase (domaine du projet + `/auth/v1/callback`), pas le callback frontend directement.
4. Dans les URL de redirection autorisées de Supabase, ajouter les deux URL frontend exactes `https://VOTRE-DOMAINE/auth/callback` et `https://VOTRE-DOMAINE/auth/reset-password`. Pour le développement : mêmes chemins sur `http://localhost:3000`. Pour Arena : utiliser l’origine effective de l’aperçu. Aucun domaine d’aperçu permanent n’est inventé.
5. Configurer la délivrabilité des emails/SMTP et vérifier que le modèle de récupération préserve le lien de confirmation Supabase et la redirection PKCE. Ouvrir le lien dans **le même navigateur**, sur **la même origine**, idéalement dans les 10 minutes. Une nouvelle demande remplace le verifier précédent.
6. Sur l’hébergement, servir `index.html` pour les chemins frontend de callback, et conserver le reverse proxy `/api`. HTTPS et `NODE_ENV=production` rendent les cookies sécurisés.
7. Les restrictions privées, le provisionnement Super administrateur, `OASIS_COMPANY_ID` et les migrations précédentes restent nécessaires, sans modification dans cette tâche. Un login Auth valide ne contourne pas ces protections.

**Google peut fournir une URL d’autorisation même si le fournisseur distant n’est pas activé.** L’interface indique ce prérequis ; les erreurs renvoyées à son callback sont explicites. La génération d’URL seule ne prouve pas une connexion Google réussie. Ces réglages n’ont pas été changés à distance.

## Tests exécutés

| Contrôle | Résultat et portée |
|---|---|
| `npm run lint` | Réussi |
| `npm run typecheck` | Réussi frontend/backend |
| `npm run build` | Réussi frontend/backend et build Vite |
| `npm test` | 81 tests réussis : 59 backend, 22 frontend |
| Contrats Auth | SDK simulé : email, téléphone, identifiants erronés, erreurs serveur, Google, récupération, origine étrangère, PKCE absent, séparation des cookies |
| SDK réellement installé | Génération Google PKCE sans réseau ; stockage de récupération avec transport simulé. Les trois clés PKCE de cette version sont prises en charge |
| Routage | Sessions simulées : URL privée anonyme, dashboard admin, redirection opérateur, compte non rattaché et callbacks avec/sans session |
| `npm run test:e2e` | Navigateur réel non authentifié : démarrage, validation email/téléphone, récupération UI, callback refusé, fond en bas, absence de camion animé, préférence de mouvement, thème clair indépendant et absence de débordement à 768/390/320 px |
| Contraste | Textes des champs/labels du formulaire au moins 4,5:1 ; contrôle ciblé, pas certification WCAG complète |
| Régression animations | Composants dashboard/chargement montés isolément sans fausse session |
| Test manuel de l’endpoint Google local | HTTP 200, URL de retour correcte, PKCE S256 et cookie httpOnly ; aucun consentement Google ni compte réel testé |

**Non exécuté :** login réussi sur compte réel (email/téléphone), consentement Google, réception réelle de l’email, échange réel d’un code, changement de mot de passe distant et parcours métier authentifiés. Les restrictions réseau du sandbox et la configuration des fournisseurs imposent une recette externe. Les tests isolés ne doivent pas être présentés comme cette recette. Aucune identité réelle n’a été créée/modifiée.

## Fichiers créés

- `frontend/src/components/auth/AuthShell.tsx`
- `frontend/src/assets/login.css`
- `frontend/src/pages/AuthReturn.tsx`
- `backend/src/routes/authFlows.ts`
- `backend/src/services/authFlow.ts`
- `backend/tests/authFlows.test.ts`
- `backend/tests/pkceStorage.test.ts`
- `frontend/tests/login.test.tsx`
- `frontend/tests/authRouting.test.tsx`
- `docs/LOGIN-INTEGRATION.md`

## Fichiers modifiés

- `frontend/src/pages/Login.tsx` — nouvelle présentation et modes de connexion.
- `frontend/src/routes/App.tsx` — exceptions de callback ciblées, règles métier conservées.
- `backend/src/routes/auth.ts` — téléphone et branchement des flux complémentaires ; changement de mot de passe existant compatible avec un compte téléphone.
- `backend/src/config/supabase.ts` — option PKCE à stockage temporaire sur la fabrique existante.
- `frontend/tests/smoke.mjs` — adaptation au nouvel accueil et nouveaux contrôles.
- `docs/ETAT-DU-PROJET.md` — état réel et lien vers ce document.

## Démarrage

Avec la configuration backend existante déjà disponible :

```bash
npm ci
npm run dev
```

Interface : port **3000**. API : port **4000**, via `/api` côté navigateur. Aucun nouveau paramètre d’environnement n’est requis par cette intégration.
