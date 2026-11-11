# OASIS Transport & Logistics

Application de gestion de flotte et de suivi financier de transport de conteneurs à Abidjan. **Version 1 : prototype fonctionnel local**, sans connexion Supabase ni authentification.

## Démarrage

Node.js 22 recommandé.

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

Ouvrir `http://localhost:3000`. Production : `npm run build && npm run start`.

## Fonctionnalités

- Tableau de bord : recettes, dépenses, résultat, graphiques et répartition des shifts.
- Camions : immatriculation, chauffeur, statut, modification et suppression protégée.
- Voyages regroupés par quantité : shift jour (06h–18h30) ou soir (19h–06h J+1), ATL/CIT, 20 DRY / 40 DRY / 40 REEFER, plein/vide, prix unitaire et encaissement.
- Dépenses générales, par camion ou liées à une ligne de voyages.
- Filtres combinables et recherche ; exports Excel et PDF multisections.
- Finances : distinction résultat, encaissements, reste dû et trésorerie simplifiée.
- Sauvegarde/restauration JSON validée et réinitialisation de la démonstration.
- Interface responsive, animations réduites si demandé, modales accessibles au clavier.

## Important avant utilisation réelle

Les données initiales sont **fictives**, les tarifs ne sont pas des prix officiels. Les données sont conservées dans le `localStorage` du navigateur : pas de synchronisation, pas de sauvegarde serveur, pas de protection par compte. Exportez et sauvegardez régulièrement. Ne pas utiliser comme système comptable de production.

Les encaissements sont rattachés à la date de départ du voyage, pas à une date bancaire. Les dépenses sont considérées payées à la date saisie. Un historique de paiements séparé sera nécessaire pour une trésorerie bancaire exacte.

Les filtres shift/terminal/conteneur/état excluent les dépenses non liées aux voyages sélectionnés. Les exports reprennent les voyages et dépenses filtrés et le parc de camions complet.

## Vérifications

```bash
npm run lint
npm run typecheck
npm test
npm run build
# Serveur démarré, test navigateur Linux :
npm run test:e2e
```

Le test navigateur utilise Chromium empaqueté par npm (Linux) et une session de navigateur isolée ; il ne modifie pas les données de votre navigateur. `APP_URL` permet de viser une autre adresse. Captures temporaires dans le dossier temporaire système.

## Architecture

- `src/app/page.tsx` : interface et opérations locales.
- `src/app/globals.css` : design responsive et animations.
- `src/lib/domain.ts` : modèles, calculs, filtres et données de démonstration.
- `src/lib/validation.ts` : validation Zod des sauvegardes et références.
- `src/lib/exports.ts` : génération Excel/PDF chargée à la demande.
- `tests/domain.test.ts` : tests unitaires.
- `tests/e2e/smoke.mjs` : parcours navigateur.

Les dépendances PostgreSQL/Drizzle et `drizzle.config.json` héritées du socle ne sont pas utilisées par cette version. Le schéma mentionné dans cette configuration n’est pas encore créé : ne pas lancer de migration à ce stade.

## Documentation

- [Prompt professionnel et cahier des charges](docs/PROMPT-PROJET.md)
- [Règles métier](docs/BUSINESS_RULES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Frontend](docs/FRONTEND.md)
- [Prochaine étape Supabase](docs/SUPABASE-INTEGRATION.md)
