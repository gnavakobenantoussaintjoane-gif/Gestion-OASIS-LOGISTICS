# Super administrateur OASIS LOGISTICS

## Fonctionnement

Le propriétaire demandé est `gnavakobenan@gmail.com`. Sa capacité de Super administrateur est enregistrée dans une table privée `oasis_super_admin` (un seul propriétaire). Elle n’est pas accordée sur la seule base d’une adresse saisie dans le navigateur, ni via des métadonnées utilisateur modifiables. Le rôle métier sous-jacent reste `admin` pour conserver les politiques RLS existantes.

Seul ce propriétaire peut créer des comptes depuis **Paramètres → Utilisateurs & permissions**, rattacher un compte confirmé ou lui attribuer un rôle Administrateur, Gestionnaire, Opérateur ou Chauffeur. L’API et la fonction SQL contrôlent cette capacité. Un administrateur ordinaire ne peut pas s’autopromouvoir ni changer les membres. Le propriétaire ne peut pas changer son propre rôle via ce formulaire.

Les nouveaux comptes sont créés par l’API administrative Auth, avec confirmation explicite par le propriétaire (pas d’e-mail automatique). Le mot de passe initial est transmis par un canal sûr, n’est pas renvoyé dans la réponse et n’est pas enregistré dans les tables métier. Le propriétaire comme les utilisateurs peuvent le remplacer dans **Paramètres → Sécurité**, avec vérification du mot de passe actuel et reconnexion. Les nouveaux mots de passe doivent contenir au moins 12 caractères.

## Provisionnement serveur (pas encore exécuté)

1. Appliquer les migrations privées et `20261111220000_oasis_super_admin.sql` après les migrations précédentes. Ne pas rejouer celles déjà appliquées.
2. Configurer `SUPABASE_SERVICE_ROLE_KEY` dans le gestionnaire de secrets serveur ou le fichier `backend/.env` ignoré. Jamais dans une variable `VITE_*`, le navigateur ou Git. Cette clé sert uniquement aux opérations Auth administratives ; les routes métier conservent le client utilisateur/RLS.
3. Depuis un terminal de confiance avec accès HTTPS à Supabase, saisir le mot de passe initial sans l’inscrire dans l’historique :

```bash
read -r -s -p 'Mot de passe initial du propriétaire : ' OASIS_BOOTSTRAP_PASSWORD
printf '\n'
export OASIS_BOOTSTRAP_PASSWORD
npm run provision:owner -w backend
unset OASIS_BOOTSTRAP_PASSWORD
```

Le script crée le compte Auth via l’API officielle, puis appelle un bootstrap SQL limité à `service_role` et à l’adresse propriétaire confirmée. Il initialise OASIS LOGISTICS, les références et le rôle administrateur sans inventer de tarifs/opérations. Si le compte existe déjà, son mot de passe n’est pas réinitialisé. Une relance reprend le provisionnement. Si une étape échoue, ne pas supposer que le compte est opérationnel.

4. Copier le véritable `OASIS_COMPANY_ID` retourné dans la configuration serveur puis redémarrer l’API. Désactiver les inscriptions publiques dans Supabase Auth.
5. Se connecter, changer immédiatement le mot de passe initial et vérifier création/rattachement/rôles avec des comptes réels.

Le mot de passe partagé dans la conversation n’est jamais inclus dans le dépôt. Il doit être considéré exposé et remplacé. La possibilité de le changer existe ; aucun changement forcé de premier accès n’est annoncé.

## État vérifié et limites

Le connecteur SQL n’offre pas de création de compte Auth par l’API administrative. Aucun compte réel ni mot de passe n’a été provisionné dans cette passe, et les nouvelles migrations ne sont pas déployées. Les tests automatisés isolés ne prouvent pas le fonctionnement Auth/SQL distant : la recette authentifiée reste obligatoire. La clé administrative doit être configurée sur l’hébergement backend avant de pouvoir créer les utilisateurs depuis l’application.
