# OASIS TRANSPORT LOGISTICS

Application web de gestion de transport de conteneurs et de finances — **phase 1 : frontend complet avec données de démonstration locales** (Supabase viendra en phase 2).

## Démarrage

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:3000> (redirection automatique vers le tableau de bord).

Production : `npm run build && npm run start`. Tests : `npx vitest run`.

## Modules

Tableau de bord · Camions · Voyages · Shifts · Dépenses · Finances · Rapports · Paramètres.

- Données **fictives**, enregistrées dans le navigateur (`localStorage`). Bouton « Réinitialiser la démo » disponible.
- Exports **Excel** et **PDF** (voyages, dépenses, rapports).
- Listes (terminaux, conteneurs, états, catégories) et grille tarifaire configurables dans **Paramètres**.

## Stack

Next.js (App Router) · React · TypeScript strict · Tailwind CSS · composants style shadcn/ui · Lucide · Recharts · React Hook Form · Zod · date-fns · ExcelJS · jsPDF + autoTable.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md)
- [`docs/FRONTEND.md`](docs/FRONTEND.md)
- [`docs/SUPABASE-INTEGRATION.md`](docs/SUPABASE-INTEGRATION.md)
