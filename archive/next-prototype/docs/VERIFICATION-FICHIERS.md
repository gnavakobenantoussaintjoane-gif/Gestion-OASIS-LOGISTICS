# Vérification des fichiers — 11 novembre 2026

Les fichiers contiennent bien du code source, et non uniquement des descriptions ou configurations :

| Fichier | Code présent |
| --- | --- |
| `src/app/page.tsx` | Interface React, navigation, formulaires, ajout/modification/suppression et stockage navigateur |
| `src/app/layout.tsx` | Structure Next.js et métadonnées |
| `src/app/globals.css` | Design, responsive et animations |
| `src/lib/domain.ts` | Types, règles de calcul, filtres et démonstration |
| `src/lib/validation.ts` | Validation Zod des sauvegardes |
| `src/lib/exports.ts` | Génération Excel et PDF |
| `tests/domain.test.ts` | 14 tests unitaires |
| `tests/e2e/smoke.mjs` | Parcours de test navigateur |
| `supabase/migrations/20261111174500_create_oasis_database.sql` | Schéma SQL et politiques RLS réellement appliqués à Supabase |

Vérifications relancées : `npm run lint`, `npm run typecheck` et `npm test` réussissent ; les 14 tests passent. La compilation de production avait également réussi lors de la vérification précédente, avant cet ajout SQL et documentaire. Aucun changement du code de l’interface n’a été effectué ici.

La base distante est créée mais le code de connexion/authentification Supabase de l’interface reste à écrire. Le fichier `drizzle.config.json` est un reliquat du socle et pointe vers un schéma TypeScript absent ; ce n’est pas le mécanisme utilisé pour créer la base Supabase.
