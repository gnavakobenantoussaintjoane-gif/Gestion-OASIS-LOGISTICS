# Frontend GESTION

Voir `frontend/src` pour l’application React 19/Vite active. Les anciens fichiers Next.js sont archivés, pas exécutés.

- Navigation et accès : `routes`, `layouts`, `contexts`.
- Modules : `pages`, avec formulaires et tableaux partagés dans `components`.
- Contrats REST : `api`, hooks TanStack Query dans `hooks`.
- Configuration des champs métier : `services/resources.ts` ; validations front RHF/Zod et validation backend indépendante.
- Design responsive et thème : `assets/styles.css`.
- Animations : `components/animations/{TruckModel,TruckScene,TruckVisual,DashboardTruckAnimation,LoginTruckAnimation,LoadingTruckAnimation}.tsx`.

Aucune donnée métier n’est conservée en localStorage. Aucun token Supabase n’est exposé à JavaScript. Seuls `gestion-theme` et `gestion-animations` y sont enregistrés. Le thème, le mouvement réduit et le repli sans WebGL sont pris en compte.
