# Installation et déploiement

## Développement

1. Installer Node 22.22+ et npm 10+, puis exécuter `npm ci` à la racine. Vérifier `npm audit --audit-level=high` (attendu : 0 vulnérabilité avec le `package-lock.json` versionné). Ne pas utiliser `npm audit fix --force` sans revue.
2. Copier `backend/.env.example` vers `backend/.env`.
3. Renseigner l’URL Supabase et **la clé publiable**, obtenues dans le tableau de bord du projet. Aucun besoin de mot de passe PostgreSQL ni de clé service-role pour l’application.
4. Vérifier que les migrations Supabase sont appliquées.
5. Lancer `npm run dev` ou lancer `npm run dev` séparément dans chaque workspace.
6. Ouvrir le frontend, créer/confirmer le compte puis configurer l’entreprise.

Le frontend ne reçoit aucune configuration Supabase. Vite transmet `/api` à `API_PROXY_TARGET` (par défaut `http://127.0.0.1:4000`). Cette adresse est utilisée par le serveur Vite, jamais par le navigateur.

## Production

- `npm ci && npm run typecheck && npm test && npm run build`.
- Héberger `frontend/dist` sur un serveur statique HTTPS avec repli SPA sur `index.html`.
- Transmettre `/api` vers le processus Express lancé par `npm start` à la racine ou `npm run start` dans backend.
- Variables serveur : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PORT`, `NODE_ENV=production`, `FRONTEND_ORIGIN=https://votre-domaine`.
- HTTPS est obligatoire en production : les cookies deviennent Secure. Le reverse proxy doit conserver l’Host public. L’API n’autorise pas un frontend tiers via CORS ; elle est conçue pour une origine commune.
- Prévoir supervision du processus, journaux sans secrets, backups Supabase, SMTP, rétention des documents et procédures de restauration.
- Configurer `trust proxy` uniquement pour les proxies explicitement fiables, en fonction de l’infrastructure ; ne pas accepter aveuglément un X-Forwarded-For utilisateur.
- Tester l’inscription, le renouvellement, la déconnexion et les permissions avec deux entreprises avant d’importer des opérations réelles.

Dans un aperçu intégré à une iframe, les règles de cookies tiers du navigateur peuvent empêcher une session. Ouvrir alors le frontend dans un onglet dédié ; ne pas affaiblir la sécurité des cookies pour contourner ce comportement.

## Réseau du sandbox

L’accès direct d’Express à Supabase a échoué dans cet environnement. Le connecteur Supabase n’est pas une passerelle HTTP utilisable par l’API. Un déploiement disposant d’un accès HTTPS au domaine Supabase est nécessaire pour la recette complète.
