# GESTION — Transport & Logistics

Application de gestion de flotte et de transport de conteneurs pour Abidjan. **Refonte React/Vite + Express réellement implémentée**, avec schéma Supabase multi-entreprise, sans données métier de démonstration. Le périmètre complet demandé n’est pas encore certifié prêt pour la production : consulter [l’état détaillé et les réserves](docs/ETAT-DU-PROJET.md).

## Architecture

```text
frontend/   React 19, Vite, TypeScript, Tailwind, React Router, TanStack Query
backend/    Node.js, Express 5, TypeScript, Supabase, Zod, ExcelJS, PDFKit
supabase/   migrations PostgreSQL, politiques RLS, tests transactionnels
archive/    ancien prototype Next.js conservé pour référence, non exécuté
 docs/      architecture, API, SQL, installation et guide utilisateur
```

Aucun Next.js, Prisma ou stockage métier local dans l’application active. Le navigateur communique avec `/api`, Express interroge Supabase avec **la session utilisateur et la clé publiable**, sans service-role. Les cookies de session sont HttpOnly ; aucun jeton n’est placé dans le localStorage. Seuls le thème et la préférence d’animation sont locaux.

## Installation et démarrage

Node.js **22.22+** recommandé. Depuis la racine :

```bash
npm install
cp backend/.env.example backend/.env
# Renseigner SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY dans backend/.env
npm run dev
```

- Frontend : `http://localhost:5173`
- Backend : `http://localhost:4000/api/health`
- Vite transmet `/api` à Express : aucun appel navigateur à localhost pour joindre un autre serveur.

Les applications peuvent être démarrées séparément :

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Le dépôt utilise les workspaces npm pour partager uniquement l’outillage de développement. Chaque application possède ses propres dépendances et responsabilités.

## Supabase et premier compte

Les migrations versionnées sont **déjà appliquées** au projet Supabase `Gestion-OASIS-LOGISTICS`. Ne pas les réexécuter sur ce projet. Pour une nouvelle base, les appliquer dans l’ordre, puis suivre [les instructions Supabase](docs/SUPABASE-INTEGRATION.md).

1. Créer son compte depuis l’écran de connexion et confirmer son adresse selon la configuration Supabase Auth.
2. Se connecter puis créer son entreprise. Le créateur devient administrateur via une fonction SQL transactionnelle, pas via des métadonnées client.
3. Ajouter les chauffeurs, les camions et **les vrais tarifs de l’entreprise**.
4. Enregistrer les voyages et dépenses. La base ne contient aucun tarif prédéfini ni opération fictive.
5. Pour rejoindre une équipe, créer et confirmer son compte **sans créer d’entreprise**, puis demander son rattachement à un administrateur.

### Limite de l’aperçu Arena

Le serveur de cet environnement n’a pas d’accès réseau direct au domaine Supabase (connexion sortante observée : `ECONNRESET`). Le connecteur Supabase a permis d’appliquer et de tester le SQL, **mais pas de valider une connexion navigateur → Express → Auth Supabase**. Le code ne contourne pas cette restriction et ne simule aucun succès. Il faut exécuter/déployer Express dans un environnement autorisant l’accès HTTPS au projet pour la recette authentifiée complète.

## Fonctionnalités implémentées

- Connexion, inscription, cookies de session, renouvellement, déconnexion et changement de mot de passe.
- Création d’entreprise, profil et rattachement de comptes existants aux quatre rôles.
- RLS par entreprise, permissions backend, clés étrangères composites et audit transactionnel.
- Camions (archivage), chauffeurs, voyages unitaires, dépenses, références et grille tarifaire.
- Shifts calculés côté serveur **et en base**, avec rattachement à la veille avant 06h et rejet hors shift.
- Tarifs actifs requis, copie historique indépendante des futures modifications, détection des doublons.
- Justificatifs PDF/JPEG/PNG ≤ 5 Mo dans un bucket privé, téléchargements signés 60 secondes.
- Tableau de bord, graphiques, rapports, filtres combinables, recherche, pagination et tri des champs autorisés.
- Exports Excel et PDF : synthèse, voyages, dépenses, camions, shifts, terminaux, chauffeurs.
- Notifications des opérations et consultation du journal d’audit.
- Thèmes clair/sombre, préférence d’animation, modales clavier et interface mobile.
- Trois animations intégrées : dashboard, connexion et chargement réel. Modèle 3D procédural original, conteneurs distincts et fallback CSS animé, sans ressource externe manquante.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
npm run build
# Avec le frontend et le backend démarrés, sous Linux :
npm run test:e2e
```

Le test navigateur contrôle la connexion non authentifiée, la validation, le thème, le responsive et les composants d’animation. **Il ne simule pas une session authentifiée et ne prouve pas une connexion à Supabase.**

Le test SQL `supabase/tests/security-and-business.sql` crée ses fixtures dans une transaction et termine par `ROLLBACK`. Réservé à une base de développement ou de recette. Aucun jeu de données de test n’est chargé dans le logiciel.

## Production

`npm run build` génère `frontend/dist` et `backend/dist` (artefacts ignorés par Git). Servir le frontend sur HTTPS avec repli SPA vers `index.html` et transmettre `/api` vers Express sur **la même origine**. Configurer `NODE_ENV=production`, `FRONTEND_ORIGIN` et les variables Supabase côté serveur. `npm start` démarre l’API compilée. Le backend doit pouvoir joindre Supabase en HTTPS. Voir [le guide de déploiement](docs/INSTALLATION.md).

## Documentation

- [État du projet, limites et recette restante](docs/ETAT-DU-PROJET.md)
- [Architecture et sécurité](docs/ARCHITECTURE.md)
- [API REST](docs/API.md)
- [Schéma SQL et Supabase](docs/SUPABASE-INTEGRATION.md)
- [Installation et déploiement](docs/INSTALLATION.md)
- [Guide utilisateur](docs/GUIDE-UTILISATEUR.md)
- [Règles métier](docs/BUSINESS_RULES.md)

Les documents de l’ancienne démonstration sont conservés dans `archive/next-prototype/docs` et ne décrivent pas l’état actuel.
