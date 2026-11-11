# Cahier des charges actif — GESTION

Développer GESTION comme un SaaS de flotte, transport de conteneurs et finances pour Abidjan. Stack : React 19, TypeScript, Vite, Tailwind, Router, TanStack Query, RHF/Zod, Recharts, Motion, Three/R3F/Drei ; API Node/Express séparée ; Supabase PostgreSQL/Auth/Storage et RLS par entreprise. Aucun Next.js ni stockage local des opérations.

Périmètre cible : entreprises et quatre rôles, chauffeurs et documents, camions et historique, voyages unitaires jour/soir, tarif historique selon terminal/conteneur/état/shift, dépenses et justificatifs privés, finances exactes, tableaux de bord, filtres, rapports Excel/PDF, notifications, audit et paramètres. Aucune donnée fictive ni prix inventé ne doit remplacer une configuration réelle.

Identité visuelle : marine, bleu électrique, blanc/gris, accents recettes/dépenses. Trois animations réellement intégrées : grande bannière dashboard, scène de connexion et chargement lié à l’état réel. Variantes 20 DRY, 40 DRY et 40 REEFER, fallback sans WebGL, mobile, mouvement réduit et réglage de désactivation.

Règle de nuit : les départs avant 06h appartiennent à la date comptable de la veille. 06h et 18h30 exactes sont jour, 18h45 est hors shift, 19h est soir. Ne pas recompter une recette lors d’un changement de tarif.

Livrer du code modulaire, validations front/backend/base, contrôles de droits dans l’API et RLS, tests unitaires et intégration, documentation, builds et recette avec de vrais comptes autorisés. Ne jamais déclarer la livraison terminée si le réseau ou les parcours authentifiés n’ont pas été validés.

Le suivi de réalisation et les écarts à ce périmètre sont documentés dans [ETAT-DU-PROJET.md](ETAT-DU-PROJET.md). L’ancien prompt du prototype local est conservé dans `archive/next-prototype/docs/PROMPT-PROJET.md` uniquement comme historique.
