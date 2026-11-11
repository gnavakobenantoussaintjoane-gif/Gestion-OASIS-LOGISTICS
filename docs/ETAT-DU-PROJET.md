# État réel — 11 novembre 2026

## Nouvelle connexion Gestion — intégration isolée

La connexion utilise désormais une page claire dédiée, une présentation à gauche, un formulaire à droite et un fond CSS/SVG animé **en bas uniquement**. L’illustration de camion est fixe. Les anciennes animations et le dashboard sont conservés, sans changement de leurs composants ni des styles globaux. Ajout des connexions email/téléphone, du flux Google PKCE et de la récupération email via le client Supabase serveur existant. Aucun changement de tables, RLS, rôles, dépendances ou variables d’environnement.

81 tests automatisés, lint, TypeScript, builds et smoke navigateur passent. Les tests de contrats Auth et de rôles sont isolés/simulés ; aucun succès de connexion réelle, consentement Google ou délivrance d’email n’est revendiqué. Les fournisseurs et URL de retour exigent une configuration externe : voir [LOGIN-INTEGRATION.md](LOGIN-INTEGRATION.md), qui contient le périmètre, les listes de fichiers et les résultats détaillés.

## Animation et lisibilité — nouvelle présentation

La connexion utilise désormais une scène SVG de route dédiée : camion agrandi, décor portuaire, marquage routier défilant et mouvement de suspension discret. Le bouton pause/reprise suit la préférence globale ; le réglage système de réduction des mouvements est pris en compte, y compris lorsqu’il change pendant l’affichage. Les animations distinctes dashboard et chargement sont conservées.

Les titres, textes de formulaire, champs, boutons, labels, tableaux et menus ont été renforcés. Contrôle navigateur du contraste texte/fond des champs et labels du formulaire : au moins 4,5:1 en modes clair et sombre (ce contrôle ciblé n’est pas un audit WCAG complet). Captures ordinateur et mobile contrôlées sans débordement horizontal à 390 px. La connexion reste prioritaire sur mobile, avec la scène sous le formulaire.

Vérifications : 54 tests, builds, lint et TypeScript réussis ; smoke navigateur étendu à pause/reprise, réduction des mouvements, taille des champs et contraste du formulaire. Aucun parcours authentifié supplémentaire n’a été validé.

## Super administrateur — préparation

Ajout du contrôle propriétaire privé, des routes de création de comptes Auth et de la gestion des rôles réservée au Super administrateur. Le changement de mot de passe reste disponible dans Paramètres → Sécurité. Les migrations et le provisionnement réel de `gnavakobenan@gmail.com` ne sont pas exécutés : voir [SUPER-ADMIN.md](SUPER-ADMIN.md). Aucune valeur de mot de passe demandée n’est enregistrée dans Git.

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
