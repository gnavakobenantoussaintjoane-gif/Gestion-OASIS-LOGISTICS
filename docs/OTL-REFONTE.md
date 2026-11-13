# Refonte OTL — analyse préalable et suivi

> **Évolution ultérieure :** la carte de connexion reproduit désormais au pixel la maquette fournie (coordonnées relevées, espacements en `cqw`), voir `docs/ETAT-DU-PROJET.md`.
>
> **Contexte 3D :** à la demande du propriétaire, la connexion utilise désormais la maquette fournie comme image fixe, sans Canvas/GLB. Le formulaire HTML reste interactif. Les détails 3D ci-dessous décrivent la tranche précédente ; pour la vérification actuelle, lancer `node frontend/tests/loginStatic.mjs` plutôt que l’ancien `truck3d.mjs`. Les animations internes restent inchangées.

## Architecture constatée avant modification

- React/TypeScript/Vite frontend ; Express/Node backend ; Supabase Auth, REST et RLS. Aucun changement de stack prévu.
- Routes : `/` dashboard, `/records/:resource` CRUD générique, `/reports`, `/shifts`, `/settings`, `/notifications`, `/audit`, retours `/auth/callback` et `/auth/reset-password` ; écran de rattachement pour comptes sans entreprise.
- Ressources : camions, chauffeurs, voyages, dépenses, tarifs, terminaux, types de conteneurs, catégories. Formulaires, filtres, détails, suppression et pièces jointes restent fonctionnels.
- Rôles : admin, manager, operator, driver ; capacité propriétaire SQL distincte. API et RLS font autorité. Navigation filtrée conservée.
- Composants partagés : AppLayout, Brand, Modal, ResourceForm, FiltersBar, ExportButtons, DashboardCharts, AuthShell, animations dashboard/chargement.
- Bibliothèques déjà présentes : Motion, Recharts, Three, React Three Fiber, Drei, Lucide, Sonner, React Query. Aucune nouvelle dépendance nécessaire.
- Incohérences : logos textuels, palette bleue/violette dispersée, login latéral plutôt que central, styles Auth distincts et anciens décors inutilisés.
- Supabase : Auth/DB/REST sains selon connecteur de gestion ; accès HTTPS du sandbox historiquement bloqué. Aucun changement de table, RLS, Auth ou provisionnement prévu dans cette refonte.

## Plan progressif

1. Original officiel et composant de logo commun ; tokens OTL et composants partagés.
2. Connexion centrale glassmorphism, véritable environnement GLB/entrepôt, variantes mobile et fallback.
3. Layout, tableaux/formulaires, cartes, graphiques, notifications, exports et impression.
4. Tests techniques, rôles et routes isolés, captures responsive ; documenter les limites réelles.

## Références

- Logo original fourni : `shared/branding/otl-logo.jpg`, copie publique identique `frontend/public/branding/otl-logo.jpg`. Proportions 1280×640 ; fond blanc d’origine conservé, pas de pseudo-version sombre ni redessin.
- Maquette fournie : `docs/references/otl-login-reference.png`. Référence visuelle uniquement, jamais utilisée comme faux formulaire ou comme scène 3D.
- Le logo est une marque fournie par l’utilisateur ; il n’est pas couvert par la licence CC0 du camion Kenney.

## Limites de données à respecter

Le schéma actuel ne fournit pas de suivi GPS, photos des véhicules/chauffeurs, consommation carburant en litres, agenda de maintenance ou état de mission « en cours ». Ne pas inventer ces informations ni créer de nouvelles tables sous couvert de refonte. Les dépenses existantes restent filtrables par catégorie, dont carburant/entretien si présentes. Le parc et les statuts existants peuvent être présentés sans nouveaux KPI fictifs.

## Première tranche réalisée

- `OtlLogo` (export de `Brand.tsx`) : image originale accessible, ratio 2:1, source locale ; Brand réutilisé pour navigation, accueil dashboard et chargement. Logo dédié à l’impression dans le layout.
- `otl-theme.css` : tokens de palette, contrastes light/dark, rayons, ombres, durées, alias des variables historiques. Cartes, tables, boutons, formulaires, modales et notifications reprennent le système sans dupliquer les pages.
- AuthShell et CSS Auth : en-tête logo/devise, carte centrale, bouton orange, footer bleu marine ; conservation des champs étiquetés, erreurs, téléphone, OAuth, récupération. Badge « Accès privé » plutôt qu’un faux statut « En ligne ». Aucun faux support 24/7 ni option « se souvenir » sans effet serveur.
- `LogisticsHub.tsx` : véritable entrepôt géométrique, quatre quais, balisage et éclairage, panneau au logo original. GLB Kenney adapté OTL, 251 220 octets, JPEG officiel embarqué. Quatre camions sur desktop (un mobile + trois stationnés), deux sur mobile. Géométries et textures GLB partagées, pas de création Three dans useFrame. Modèle toujours stylisé.
- Graphiques : recettes/bénéfices bleu marine, dépenses orange, palette catégorielle OTL ; respect du réglage d’animations et de prefers-reduced-motion. Séries et calculs inchangés.
- Exports : logo original inclus dans chaque feuille Excel et page PDF de section ; en-têtes bleu OTL. Les noms, cellules et données financières restent préservés. Impression navigateur : logo et suppression des contrôles de navigation.
- Corrections responsive : padding du main métier neutralisé pour Auth ; sélecteur administratif long contenu dans sa carte sur smartphone.
- Toutes les routes métier existantes bénéficient des composants et tokens partagés : camions, chauffeurs, voyages, dépenses, tarifs, référentiels, rapports, shifts, paramètres, notifications et audit. Aucune nouvelle fonctionnalité de suivi/maintenance n’est prétendue implémentée.

## Animations conservées / harmonisées

Transitions Motion de page existantes conservées ; cartes et modales apparaissent doucement, cartes et boutons se soulèvent légèrement sur desktop, pression visuelle, focus et survol des lignes. Notifications Sonner existantes thématisées. Mouvement GLB et roues du camion conservés, préférences et onglet caché respectés. Le décor est chargé par lazy/Suspense et dispose d’un fallback statique sans WebGL, si le GLB échoue ou si le contexte est perdu. DPR mobile 1 et ombres désactivées, desktop max 1,5 et ombres 512². Pas de compteur qui invente une évolution ni d’animation de statut sans événement métier réel.

## Vérifications de cette tranche

- TypeScript frontend/backend, lint, build : réussis.
- **88 tests unitaires réussis** : 59 backend et 29 frontend. Quatre tests OTL ajoutés (image/alt/ratio, mode décoratif, original identique, présence du JPEG dans le GLB). Tests exports renforcés pour l’image Excel/PDF et les cellules existantes.
- Smoke navigateur existant : réussi (formulaires, callback refusé, téléphone, récupération, contraste ciblé, responsive 768/390/320, composants dashboard/chargement isolés).
- Test GLB réel sous Chromium SwiftShader : réussi desktop/mobile, formulaire disponible pendant le téléchargement bloqué, DPR, réduction/reprise du mouvement et fallbacks.
- `node frontend/tests/otlPages.mjs` : **37 combinaisons page/rôle**, chacune à 1440 et 390 px, sans débordement et sans erreur JavaScript, avec ouverture/fermeture des formulaires de création administratifs sur mobile (sans soumission). Ce test **isole l’interface avec identité de test et réponses vides, en interdisant toute écriture**. Il ne prouve pas un login réel ni des droits SQL distants. Aucun compte de test créé dans Supabase, aucune opération fictive injectée dans l’application livrée.
- Services Supabase Auth/DB/REST sains selon le connecteur. Diagnostic serveur `check:supabase` : DNS OK, HTTPS échoue encore avec ECONNRESET. Auth réelle, réception email, Google et parcours métier authentifiés non validés à cause du réseau de l’aperçu.

## Ce qui reste à faire avant recette complète

1. Le rendu actuel **ne reproduit pas à l’identique le photoréalisme de l’image 1** : pas de ciel photo, avion animé, reflets humides haute fidélité ou modèle de camion premium. La maquette fournie reste référence, pas fond 2D présenté comme 3D. Une passe artistique supplémentaire avec des modèles/environnements optimisés et licenciés est nécessaire pour atteindre ce niveau.
2. Recette avec données réelles et utilisateurs autorisés lorsque le réseau le permet ; vérification des états remplis, fichiers longs, actions CRUD réelles, Google/email et téléchargements depuis l’hébergement final.
3. Contrôles sur Android/iPhone physiques, mesures FPS/mémoire prolongées, audit d’accessibilité complet et inspection manuelle des impressions/PDF réels multi-pages.
4. Photos, carburant en litres, maintenance et suivi temps réel nécessitent une spécification et des données absentes ; non créés, conformément à l’interdiction de modifier les tables/RLS.

## Dépendances et déploiement

**Aucune dépendance npm ajoutée**, aucune modification des tables, migrations, RLS, routes API métier ou flux Auth. La seule modification serveur concerne la présentation des exports demandée. Python/Pillow sert uniquement à régénérer l’asset livré, pas au runtime.

Déployer `frontend/public/branding`, le GLB et **`shared/branding/otl-logo.jpg` avec le backend** ; conserver la structure du dépôt pour que le chemin du logo export fonctionne en sources comme depuis `backend/dist`. La duplication publique du logo est vérifiée par test d’identité binaire. Le logo utilisateur n’est pas CC0, contrairement à la géométrie source Kenney. Aucun secret nouveau en Git.

## Inventaire des fichiers de cette tranche

### Modifiés

- `backend/src/services/exports.ts`
- `backend/tests/exports.test.ts`
- `docs/ETAT-DU-PROJET.md`
- `docs/LOGIN-3D.md`
- `frontend/index.html`
- `frontend/public/models/README.md`
- `frontend/public/models/truck.glb`
- `frontend/scripts/build-truck-model.py`
- `frontend/src/assets/login.css`
- `frontend/src/assets/styles.css`
- `frontend/src/components/Brand.tsx`
- `frontend/src/components/DashboardCharts.tsx`
- `frontend/src/components/animations/DashboardTruckAnimation.tsx`
- `frontend/src/components/animations/LoadingTruckAnimation.tsx`
- `frontend/src/components/animations/TruckIllustration.tsx`
- `frontend/src/components/animations/TruckModel.tsx`
- `frontend/src/components/animations/TruckScene.tsx`
- `frontend/src/components/auth/AuthShell.tsx`
- `frontend/src/components/login3d/TruckScene.tsx`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/main.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/tests/smoke.mjs`
- `frontend/tests/truck3d.mjs`
- `frontend/tests/truckAsset.test.ts`

### Créés

- `docs/OTL-REFONTE.md`
- `docs/references/otl-login-reference.png`
- `frontend/public/branding/otl-logo.jpg`
- `frontend/src/assets/otl-theme.css`
- `frontend/src/components/login3d/LogisticsHub.tsx`
- `frontend/tests/otlDesign.test.tsx`
- `frontend/tests/otlPages.mjs`
- `shared/branding/README.md`
- `shared/branding/otl-logo.jpg`
