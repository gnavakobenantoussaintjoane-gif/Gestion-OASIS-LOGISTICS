# Supabase — étape suivante (non implémentée)

La version actuelle ne contacte aucun projet Supabase. Ne pas confondre le profil « Administrateur » affiché dans la démonstration avec un compte authentifié.

Avant la mise en production :

1. Définir l’entreprise, les utilisateurs et leurs rôles : administrateur, exploitant et lecture seule, puis faire valider les droits.
2. Créer les tables entreprises, membres, camions, voyages, dépenses et paiements, avec clés étrangères, contraintes de montants et dates.
3. Utiliser Supabase Auth et des politiques RLS par entreprise. Écrire des tests qui vérifient l’impossibilité de consulter ou modifier les données d’une autre entreprise.
4. Valider côté serveur toutes les opérations sensibles, sans faire confiance au navigateur.
5. Créer un journal d’audit pour les écritures financières et une stratégie de sauvegarde/restauration.
6. Ajouter des paiements séparés avec leur date d’encaissement, pour des états financiers réellement temporels.
7. Prévoir un import explicite et validé des données locales après confirmation ; aucune migration silencieuse des données fictives.
8. Ne jamais exposer de clé `service_role` dans une variable `NEXT_PUBLIC_*`. L’URL publique et la clé publiable ne sont pas des mécanismes d’autorisation : la sécurité repose sur les politiques et les droits.

La configuration Drizzle héritée pointe vers une base locale d’exemple et un schéma inexistant. Choisir la stratégie de migrations avant de l’utiliser. Aucune base distante n’a été modifiée.
