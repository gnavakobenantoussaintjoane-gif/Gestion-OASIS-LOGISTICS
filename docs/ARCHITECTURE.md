# Architecture

Next.js App Router, React et TypeScript strict. Page interactive côté client, rendu initial stable puis chargement du stockage navigateur après montage. Pas d’accès réseau métier, pas d’API, pas de secret requis.

Les entités Truck, Trip et Expense sont définies dans `src/lib/domain.ts`. Les calculs et filtres sont purs et testés avec Vitest. Zod valide les sauvegardes importées et les données relues du stockage. Les exports utilisent ExcelJS et jsPDF + autoTable, importés à la demande.

La page gère l’état local, la navigation et les formulaires. Pour une extension multiutilisateur, extraire les modules d’interface en composants et remplacer la persistance locale par une couche d’accès aux données authentifiée, sans déplacer les règles métier dans les composants.

## Dépendances

Les dépendances Next.js et PostCSS initiales ont été actualisées pour supprimer les alertes hautes/critiques observées. L’override ciblé `exceljs > uuid` utilise 11.1.1 ; les exports doivent être retestés lors de toute mise à jour. Certaines dépendances d’outillage héritées peuvent encore présenter des alertes modérées : vérifier `npm audit` avant déploiement. Ne pas appliquer aveuglément `npm audit fix --force`.
