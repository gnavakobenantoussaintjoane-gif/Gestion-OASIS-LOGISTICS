# État réel — 14 novembre 2026

## Connexion des pages à la base — audit et corrections (13 novembre 2026)

L’audit page par page est dans [AUDIT-PAGES-2026-11-13.md](AUDIT-PAGES-2026-11-13.md). Aucun écran ne contenait de mock : le chantier a complété les états chargement/erreur/vide, les droits d’interface et le contrat base.

- `Settings` : `/members` réservé au super administrateur, avec chargement, erreur + reprise et état vide.
- `ResourcePage` / `ResourceForm` : avertissement et reprise si les références échouent, bouton Enregistrer bloqué sans références, erreurs des références secondaires visibles, opérateur limité à ses propres voyages (aligné sur la policy `trips_update`).
- `Dashboard` : état vide explicite du tableau performance/shift ; `Notifications` : erreur en `role="alert"` et état vide d’audit dédié ; `Onboarding` : vérification et erreur visibles.
- Base : migration `20261114003715_gestion_performance_indexes` appliquée sur `nrwfnqtomyamswirrhqv` ; 5 index vérifiés (56 index `public` au total). RLS active sur les 18 tables, policies et contraintes inspectées en lecture seule.
- Tests : **99 automatisés** (67 backend, 32 frontend), dont la matrice de droits `accessMatrix` ; `pageStates.mjs` couvre erreur → reprise → vide, références non bloquantes et formulaire bloqué sans références ; `otlPages.mjs` passe 37 combinaisons page/rôle.

Limites : la base métier est vide (0 camion, 0 voyage, 0 dépense), les agrégats du dashboard restent calculés côté client, les PATCH dérivés ne sont pas recalculés et **aucun parcours authentifié réel Supabase** n’a pu être exécuté depuis le sandbox. Voir les priorités restantes dans l’audit.


## Conteneurs des missions — 14 novembre 2026

La traçabilité des conteneurs est maintenant portée par la base, pas par une saisie libre du voyage.

- Migration **`20261114010753_trip_containers` appliquée** sur `nrwfnqtomyamswirrhqv` : table `trip_containers`, clé étrangère composite vers `trips`, unicité par voyage, CHECK **ISO 6346**, index `(company_id, trip_id)` et `(company_id, number)`, RLS et deux policies (`read`, `write`).
- La règle métier **2 × 20 ou 1 × 40** est vérifiée par deux contraintes **différées** (mission et table fille), donc dans la même transaction que l’écriture. Le type doit être actif et de la bonne famille (`20_DRY`, `40_DRY`/`40_REEFER`).
- La RPC `gestion_save_trip` enregistre le voyage et remplace ses conteneurs atomiquement ; l’API `POST/PATCH /trips` accepte `containers: [{number,size}]`, renvoie `trip_containers`, et `GET /trips/:id/containers/history` expose l’audit aux admin/gestionnaire. Les actions auditées sont `CONTAINER_ADDED|UPDATED|REMOVED`.
- Interface : section **Informations sur les conteneurs** du formulaire voyage (cartes 2 × 20 / 1 × 40, champs numérotés, type 20/40, erreurs de format et doublon, validation avant confirmation), colonne **Conteneurs** dans la liste, résumé + historique dans la fiche voyage, missions et conteneurs récents dans la fiche camion, colonne conteneurs dans les Derniers mouvements du tableau de bord et dans la feuille Excel/PDF **Voyages**.
- Tests : **121** (82 backend, 39 frontend), dont 14 backend et 7 frontend dédiés aux conteneurs ; `pageStates.mjs` couvre le passage 2 × 20 → 1 × 40, le refus ISO avant écriture et l’historique de la fiche. TypeScript, ESLint et build passent.
- Vérification base : la fonction ISO a été contrôlée (`CSQU3054383`/`MSCU1234566` valides, clé fausse refusée) et un **test transactionnel admin** a créé deux 20 puis un 40, refusé un 20 seul et constaté l’audit, avant **annulation complète** ; aucune fixture n’est restée en base.

Limites : le sandbox ne joint pas Supabase depuis le processus Express, donc **aucun parcours navigateur authentifié réel** ni appel API→base réel n’a été exécuté ici ; le test transactionnel a utilisé le rôle admin. Les rôles manager/opérateur/chauffeur sur les conteneurs restent à rejouer lors de la recette finale. La base métier reste vide. Voir [AUDIT-PAGES-2026-11-13.md](AUDIT-PAGES-2026-11-13.md) §8.

## Fond de connexion GLB 3D

La demande 3D remplace la présentation précédente du shell Auth par un véritable camion GLB en plein fond et une carte glassmorphism. La stack Three/R3F/Drei existante est réutilisée, sans ajout de dépendances ni modification du backend/Auth/rôles. Le modèle CC0 Kenney est adapté en semi-remorque low-poly blanc/bleu et livré localement avec licence, provenance et source de génération. Les animations du dashboard restent inchangées.

84 tests, lint, TypeScript, build via pnpm 10, smoke navigateur et tests GLB réels sous Chromium/SwiftShader passent. Desktop/mobile, chargement retardé, réduction du mouvement, modèle absent, absence WebGL et perte de contexte ont été contrôlés. Cela ne valide ni les GPU physiques des téléphones ni les connexions Auth réelles. Voir [LOGIN-3D.md](LOGIN-3D.md) pour les fichiers, les ressources et les limites.

## Nouvelle connexion Gestion — intégration isolée

La connexion utilise désormais une page claire dédiée, une présentation à gauche, un formulaire à droite et un fond CSS/SVG animé **en bas uniquement**. L’illustration de camion est fixe. Les anciennes animations et le dashboard sont conservés, sans changement de leurs composants ni des styles globaux. Ajout des connexions email/téléphone, du flux Google PKCE et de la récupération email via le client Supabase serveur existant. Aucun changement de tables, RLS, rôles, dépendances ou variables d’environnement.

81 tests automatisés, lint, TypeScript, builds et smoke navigateur passent. Les tests de contrats Auth et de rôles sont isolés/simulés ; aucun succès de connexion réelle, consentement Google ou délivrance d’email n’est revendiqué. Les fournisseurs et URL de retour exigent une configuration externe : voir [LOGIN-INTEGRATION.md](LOGIN-INTEGRATION.md), qui contient le périmètre, les listes de fichiers et les résultats détaillés.

## Animation et lisibilité — nouvelle présentation

La connexion utilise désormais une scène SVG de route dédiée : camion agrandi, décor portuaire, marquage routier défilant et mouvement de suspension discret. Le bouton pause/reprise suit la préférence globale ; le réglage système de réduction des mouvements est pris en compte, y compris lorsqu’il change pendant l’affichage. Les animations distinctes dashboard et chargement sont conservées.

Les titres, textes de formulaire, champs, boutons, labels, tableaux et menus ont été renforcés. Contrôle navigateur du contraste texte/fond des champs et labels du formulaire : au moins 4,5:1 en modes clair et sombre (ce contrôle ciblé n’est pas un audit WCAG complet). Captures ordinateur et mobile contrôlées sans débordement horizontal à 390 px. La connexion reste prioritaire sur mobile, avec la scène sous le formulaire.

Vérifications : 54 tests, builds, lint et TypeScript réussis ; smoke navigateur étendu à pause/reprise, réduction des mouvements, taille des champs et contraste du formulaire. Aucun parcours authentifié supplémentaire n’a été validé.

## Super administrateur — préparation

Ajout du contrôle propriétaire privé, des routes de création de comptes Auth et de la gestion des rôles réservée au Super administrateur. Le changement de mot de passe reste disponible dans Paramètres → Sécurité. Les migrations privées et Super administrateur ont été appliquées et vérifiées sur Supabase ; le compte Auth confirmé `gnavakobenan@gmail.com` a ensuite été rattaché à OASIS LOGISTICS comme Super administrateur. Le nom personnalisé et le téléphone restent à fournir ; la configuration `OASIS_COMPANY_ID` du serveur déployé et le login réel restent à vérifier : voir [SUPER-ADMIN.md](SUPER-ADMIN.md). Aucune valeur de mot de passe demandée n’est enregistrée dans Git.

Contrôles locaux : 54 tests (44 backend, 10 frontend), lint, TypeScript et builds réussis. Les nouveaux tests utilisent des services Auth simulés ; aucune connexion ni création Auth réelle n’est revendiquée. La création de comptes nécessite une clé administrative strictement serveur, sans changement des clients métier soumis à RLS.

## Évolution : application privée OASIS LOGISTICS

Le nouveau périmètre remplace l’inscription libre multi-entreprise par une installation interne OASIS LOGISTICS. Le nom, l’accueil et les visuels ont été harmonisés. Les routes publiques d’inscription/création d’entreprise sont fermées et les accès métier de l’API sont verrouillés sur `OASIS_COMPANY_ID` (refus si non configuré). La configuration réelle de ce UUID, la fermeture d’Auth Supabase et l’application de la migration privée restent nécessaires : voir [OASIS-PRIVATE.md](OASIS-PRIVATE.md). Aucun premier administrateur n’a été inventé et aucune donnée existante n’a été supprimée.

Vérifications de cette évolution : 47 tests automatisés, ESLint, TypeScript, builds frontend/backend et smoke navigateur non authentifié réussis. Le rendu fallback SVG a été contrôlé sur capture ; le rendu 3D doit toujours être vérifié sur un véritable appareil avec GPU.

## Livré dans le code

Le prototype local est remplacé par une application React/Vite et une API Express séparées. Les écrans et routes d’authentification, rôles, entreprises, flotte, chauffeurs, tarifs, voyages, dépenses, justificatifs, finances, graphiques, exports, notifications, audit et paramètres sont implémentés. Aucun succès opérationnel n’est simulé. Les trois animations sont intégrées aux composants demandés et ont un fallback animé sans WebGL.

La base Supabase du projet Gestion-OASIS-LOGISTICS a reçu les migrations multi-entreprise, hardening et contrôle de disponibilité. Les anciennes tables sont conservées sous `legacy_*`, sans import automatique. Aucune opération métier ni compte de démonstration n’a été conservé.

## Vérifié

- TypeScript frontend/backend, ESLint et builds de production passent.
- 34 tests automatisés backend : horaires, minuit, montants exacts, validations, permissions de lecture, protections HTTP, sessions, limite de taille JSON et fichiers Excel/PDF.
- 10 tests frontend de régression : périodes UTC et remise à zéro, erreurs réseau/JSON/exports, expiration de session, en-têtes et isolation/annulation du cache privé.
- `npm audit` : 0 vulnérabilité signalée dans les dépendances installées (contrôle du 11 novembre 2026).
- Test navigateur : écran de connexion, validation d’inscription, thème, mobile et composants d’animation dashboard/chargement. Aucune fausse session injectée.
- Test transactionnel exécuté sur PostgreSQL : isolation de deux entreprises, permissions opérateur, refus anonyme, références interentreprise, tarif historique, doublons, date comptable de nuit, audit, préservation d’une dépense à la suppression du voyage. Un second test SQL a confirmé toutes les bornes horaires demandées et le rejet d’un camion archivé après ajout des gardes de disponibilité. Toutes les fixtures ont été annulées.

## Correctifs de régression — 11 novembre 2026

- Le quota de tentatives d’authentification ne s’applique plus aux consultations de session ni à la fermeture de session ; le quota global de l’API reste actif.
- Les pannes temporaires d’Auth (réseau/statuts serveur) ne sont plus confondues avec des identifiants invalides. Les cookies renouvelés sont aussi disponibles aux traitements suivants de la même requête.
- La déconnexion efface les cookies même sans session valide ; si la révocation distante échoue, l’interface le signale sans prétendre avoir révoqué le jeton distant.
- Le cache métier est annulé puis supprimé au changement de compte ou à l’expiration, sans supprimer la requête de session observée.
- Les filtres du dashboard suivent l’URL ; les modules de ressources sont remontés à la navigation pour ne plus conserver les modales, filtres et pages du module précédent. Une ressource inconnue ne déclenche plus sa requête de liste.
- Le sélecteur de période reflète les dates et la remise à zéro ; les bornes sont calculées en UTC, fuseau d’Abidjan.
- Le client refuse les réponses HTML/JSON invalides et les faux exports ; les erreurs réseau sont explicites. Les corps JSON trop volumineux renvoient 413 au lieu de 500.
- Un tri secondaire par identifiant stabilise la pagination des listes ayant des valeurs de tri identiques.
- Les dépendances de développement vulnérables ont été corrigées et les tests frontend font désormais partie de `npm test`.

Contrôles relancés : lint, TypeScript, 44 tests, builds backend/frontend, audit et smoke navigateur non authentifié. La configuration locale ignorée `backend/.env`, absente de ce nouveau checkout, a été restaurée avec la clé **publishable** existante (aucune clé privilégiée).

## Bloquant pour la recette de bout en bout

Lors de la recette précédente, le serveur de cet environnement ne pouvait pas joindre le domaine Supabase en HTTPS (`ECONNRESET`). La recette authentifiée n’a pas été réexécutée pendant cette passe de correction. Le connecteur a accès à la base, mais ce n’est pas le réseau du processus Express. Il n’a pas été utilisé pour simuler des appels métier à la place du backend.

Il reste à exécuter depuis un environnement réseau autorisé : inscription et confirmation e-mail réelles, connexion/déconnexion/renouvellement, création d’entreprise, rattachement de membres, parcours complets par les quatre rôles, upload/download réel et vérification de persistance après reconnexion. **Le projet ne doit pas être annoncé comme prêt pour la production avant cette recette.**

## Éléments du cahier des charges encore à compléter

- Upload du logo de l’entreprise et incorporation d’un logo personnalisé dans les rapports. Les rapports actuels portent la marque textuelle GESTION.
- Horaires des shifts actuellement fixés aux règles demandées ; la table de définition existe mais l’édition des horaires n’est pas exposée, pour éviter une incohérence avec les triggers. Une future modification devra versionner les règles, harmoniser SQL/API/UI et préserver les écritures historiques.
- Notifications automatiques spécialisées : seuil de dépense importante configurable, tarif manquant et dépenses sans justificatif. Les notifications actuelles couvrent les écritures effectuées par l’utilisateur ; les permis expirants sont signalés sur le dashboard, pas par un planificateur d’e-mails.
- Configuration fine des permissions par utilisateur au-delà des quatre rôles fixes.
- MFA, récupération du mot de passe par e-mail, invitation e-mail automatisée et administration du cycle de vie complet des comptes.
- Trésorerie avec paiements datés, fiscalité et amortissements : le bénéfice présenté est un résultat d’exploitation simplifié, non une comptabilité certifiée.
- Export PDF spécifique préformaté par fréquence : la période des filtres permet déjà un rapport journalier/mensuel/annuel, mais il n’y a pas encore de modèles de rapport distincts.
- La liste des voyages rattachables à une dépense est limitée aux 100 plus récents dans le formulaire ; prévoir une recherche paginée pour les historiques importants.
- Audit de performance, tests de charge, accessibilité avancée et recette WebGL sur de vrais appareils. Le fallback a été vérifié ; le rendu GPU doit être contrôlé sur le matériel de destination.

## Décisions conservatrices

Aucun tarif inventé. Pas de retrait des politiques RLS pour faciliter le développement. Pas de compte administrateur ou mot de passe imposé. Pas d’exposition de service-role. Pas de données temporaires utilisées comme opérations réelles. Les seuls jeux de données artificiels sont des fixtures de tests isolées, jamais affichées comme activité d’entreprise.

## Identité OASIS LOGISTICS et diagnostic réseau

La marque visible du shell Auth et du camion GLB est désormais OASIS LOGISTICS. La configuration exemple du backend référence le projet et l’entreprise réels, sans secret. Une commande `npm run check:supabase -w backend` distingue DNS et accès HTTPS Auth sans identifiants utilisateur. Dans le sandbox, DNS fonctionne mais HTTPS Supabase reste interrompu (`ECONNRESET`) ; les services distants sont sains selon le connecteur de gestion. Les 84 tests, le build, TypeScript, lint et les contrôles navigateur passent, sans prétendre résoudre le blocage réseau ou valider une connexion réelle. Voir [CONNEXION-SERVEUR.md](CONNEXION-SERVEUR.md).

## Première tranche de refonte OTL

Logo original OTL fourni intégré sans redessin, thème bleu marine/orange centralisé, shell Auth central, véritable entrepôt 3D et plusieurs camions GLB, graphiques harmonisés et exports PDF/Excel au logo officiel. Les composants partagés habillent les routes existantes ; aucune nouvelle table, RLS, donnée fictive ou dépendance npm. 88 tests unitaires, TypeScript, lint, build et smoke/GLB navigateur passent ; 37 combinaisons page/rôle sont contrôlées à vide en rendu isolé desktop/mobile avec formulaires administratifs sans soumission. Le photoréalisme de la référence n’est pas encore atteint, les modules non présents dans le schéma ne sont pas inventés, et la connexion réelle reste bloquée par le réseau Arena. Le dossier `shared/branding` doit accompagner le backend au déploiement pour les exports. Voir [OTL-REFONTE.md](OTL-REFONTE.md) pour le périmètre, les fichiers et la recette restante.

## Connexion : fond statique demandé par le propriétaire

La dernière demande remplace la scène GLB de connexion par l’image fournie, copiée intacte dans `frontend/public/branding/otl-login-background.png`. AuthShell ne charge plus TruckBackground, WebGL ou les modèles de connexion. Le formulaire reste du HTML interactif, posé sur une carte opaque couvrant les champs dessinés dans l’image. L’image est décorative : ses mentions « En ligne », « Support 24/7 » et sa case dessinée ne sont pas des états ou fonctionnalités de l’application. Les animations dashboard/chargement sont conservées. Aucun backend, compte, rôle ou RLS modifié ; le problème réseau Supabase reste indépendant.

TypeScript, lint, build, 88 tests unitaires, smoke navigateur et `node frontend/tests/loginStatic.mjs` réussis. Le nouveau test remplace `truck3d.mjs` : image chargée, aucun Canvas/GLB sur Auth, formulaire utilisable, responsive 1440/390/320 et fond manquant. Captures desktop/mobile inspectées. Aucune connexion réelle revendiquée.

## Connexion alignée au pixel sur la maquette définitive

La maquette fournie (`frontend/public/branding/otl-login-background.png`) reste la référence intacte. Le décor réellement servi est `frontend/public/branding/otl-login-stage.jpg`, dérivé de cette maquette : seuls les éléments **dessinés dans la carte** (logo, titre, onglets, champs, boutons) ont été retirés de son intérieur ; le cadre de verre, le liseré orange, l’éventail bleu du coin supérieur droit et les reflets sont conservés. Aucun redessin de la scène.

La carte HTML est positionnée exactement sur ce cadre : x 575 → 1097 px, y 155 → 812 px sur 1672 × 941, largeur `31,22 %` et ratio `522/657`. Ses espacements internes sont en `cqw` (logo, titre, sous-titre, trait orange, onglets, champs, options, bouton, séparateur, Google) : la composition garde les mêmes proportions à toutes les échelles desktop, sans seconde carte ni décalage. Le titre est « Bienvenue sur Gestion », la police est **Plus Jakarta Sans** (SIL OFL, auto-hébergée) aux tailles et espacements relevés.

Éléments réels repris de la maquette : logo officiel détouré pour le verre, onglets E-mail/Téléphone avec icônes, champs avec icônes, case « Se souvenir de moi », lien « Mot de passe oublié ? », bouton orange, séparateur « OU », bouton Google. La case mémorise uniquement l’identifiant dans `localStorage` (jamais le mot de passe, la durée du cookie de session reste fixée par le serveur). Les libellés réels restent associés aux champs pour les lecteurs d’écran ; seuls les placeholders sont visibles, comme sur l’image. Les erreurs et confirmations sont des alertes flottantes : elles ne déplacent jamais la composition.

Sous 1100 px (tablette/mobile), le décor paysage et son cadre ne sont pas rétrécis : en-tête réel (logo sur plaque, slogan, badge « En ligne »), héros camion (`otl-login-trucks-banner.png`), carte de verre réelle et bandeau inférieur réel avec les trois garanties et la signature. Aucun second formulaire, aucun Canvas ni GLB. Le comportement est couvert par `frontend/tests/loginStatic.mjs` (recouvrement exact de la carte mesuré à 1440 px, aucun chargement GLB/Canvas, formulaire utilisable, image manquante) et `frontend/tests/smoke.mjs` (contraste, téléphone, récupération, responsive 768/390/320, callback), avec 91 tests unitaires, TypeScript, lint et build réussis. Aucune connexion réelle revendiquée.
