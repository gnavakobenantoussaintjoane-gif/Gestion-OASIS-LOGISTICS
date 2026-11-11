# Supabase / SQL GESTION

## Projet existant

Projet : **Gestion-OASIS-LOGISTICS** (`nrwfnqtomyamswirrhqv`). Les migrations SQL de ce dépôt ont été appliquées via le connecteur. Ne pas les rejouer sur ce projet.

## Ordre des migrations pour une nouvelle base Supabase vide

1. `20261111174500_create_oasis_database.sql` : ancien schéma propriétaire.
2. `20261111180000_gestion_saas.sql` : conservation sous `legacy_*`, nouveau schéma par entreprise.
3. `20261111190000_gestion_hardening.sql` : droits de correction des dépenses, accès des chauffeurs et synchronisation des opérations.
4. `20261111193000_gestion_operation_guards.sql` : rejet des camions archivés/en maintenance/hors service, chauffeurs inactifs et références désactivées pour les nouveaux voyages.

Ces scripts sont destinés à Supabase, qui fournit `auth.users`, `auth.uid()`, les rôles anon/authenticated et Storage. Ne pas les exécuter dans un PostgreSQL nu sans ces composants. Utiliser l’éditeur SQL ou un outil de migrations avec historique ; conserver l’ordre et les transactions. Aucune migration ne charge des opérations fictives ni des prix.

## Tables

- `companies` : entreprise, coordonnées, devise et fuseau.
- `profiles`, `user_roles` : membre unique d’une entreprise et rôle contrôlé.
- `drivers`, `trucks` : personnes, documents et flotte.
- `terminals`, `container_types`, `shift_definitions`, `expense_categories` : références propres à l’entreprise.
- `tariff_rules` : prix actifs selon terminal/conteneur/état/shift.
- `trips` : un voyage unitaire, heure de départ, date comptable, tarif historique.
- `expenses` : paiements de charges, associations facultatives et chemin de justificatif.
- `notifications`, `audit_logs` : événements personnels et traçabilité d’entreprise.

Les trois tables `legacy_*` conservent le schéma historique et ses RLS. Elles ne sont pas utilisées par l’API GESTION.

## RLS

Le rôle est lu en base, jamais depuis des champs librement modifiables du JWT. Les fonctions `gestion_company()` et `gestion_role()` évitent la récursion des politiques et ont un search_path fermé.

- **Admin** : opérations, paramètres, rattachement des membres, audit et finances.
- **Gestionnaire** : opérations, dépenses, rapports, audit ; tarifs en lecture.
- **Opérateur** : références et voyages ; création et correction de ses propres voyages ; pas de suppression ni lecture des dépenses.
- **Chauffeur** : son profil chauffeur, son camion associé et ses propres missions, sans écriture d’opérations.

L’API applique ces contrôles avant les requêtes, et la base les applique à nouveau. Les clés étrangères composites empêchent les liens interentreprise. L’historique du tarif est protégé par trigger.

## Auth et Storage

Configurer dans Supabase Auth l’URL du site et les redirections autorisées pour le domaine final. Ne pas désactiver la confirmation e-mail pour contourner un problème de livraison ; configurer SMTP avant production. Créer les comptes depuis l’application. Le premier membre confirmé crée une entreprise ; les membres suivants attendent leur rattachement sans créer d’autre entreprise.

Le bucket `gestion-receipts` est privé : PDF, JPEG ou PNG, 5 Mo maximum. Chemins `company_uuid/expense_uuid/random_uuid.extension`. Lecture/écriture réservées aux admins et gestionnaires de l’entreprise. L’API vérifie l’appartenance de la dépense et la signature du fichier, puis fournit un lien signé valable 60 secondes.

## Tests

`supabase/tests/security-and-business.sql` a été exécuté avec succès sur le schéma multi-entreprise et hardening. Il utilise des fixtures Auth et métier dans une transaction annulée. Le contrôle supplémentaire de disponibilité a ensuite été ajouté ; le test prévoit désormais le refus d’une référence interentreprise par contrainte ou par disponibilité. `supabase/tests/shift-boundaries.sql` a ensuite été exécuté avec succès après le contrôle de disponibilité : il vérifie toutes les bornes horaires demandées et le rejet d’un camion archivé, avec annulation de toutes ses fixtures. Réexécuter les tests SQL après tout changement de politique ou trigger sur une base de recette.

Les essais HTTP Auth/Storage depuis Express restent bloqués par l’accès réseau de l’environnement, comme expliqué dans `ETAT-DU-PROJET.md`.
