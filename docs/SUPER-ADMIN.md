# Super administrateur OASIS LOGISTICS

## Fonctionnement

Le propriétaire demandé est `gnavakobenan@gmail.com`. Sa capacité de Super administrateur est enregistrée dans une table privée `oasis_super_admin` (un seul propriétaire). Elle n’est pas accordée sur la seule base d’une adresse saisie dans le navigateur, ni via des métadonnées utilisateur modifiables. Le rôle métier sous-jacent reste `admin` pour conserver les politiques RLS existantes.

Seul ce propriétaire peut créer des comptes depuis **Paramètres → Utilisateurs & permissions**, rattacher un compte confirmé ou lui attribuer un rôle Administrateur, Gestionnaire, Opérateur ou Chauffeur. L’API et la fonction SQL contrôlent cette capacité. Un administrateur ordinaire ne peut pas s’autopromouvoir ni changer les membres. Le propriétaire ne peut pas changer son propre rôle via ce formulaire.

Les nouveaux comptes sont créés par l’API administrative Auth, avec confirmation explicite par le propriétaire (pas d’e-mail automatique). Le mot de passe initial est transmis par un canal sûr, n’est pas renvoyé dans la réponse et n’est pas enregistré dans les tables métier. Le propriétaire comme les utilisateurs peuvent le remplacer dans **Paramètres → Sécurité**, avec vérification du mot de passe actuel et reconnexion. Les nouveaux mots de passe doivent contenir au moins 12 caractères.

## Provisionnement serveur (compte encore à créer)

1. Les migrations `oasis_private_access` et `oasis_super_admin` ont été appliquées le 11 novembre 2026 au projet `nrwfnqtomyamswirrhqv` via le connecteur Supabase. Ne pas les rejouer sur ce projet. Pour une nouvelle installation, appliquer les migrations dans leur ordre.
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

Les deux migrations manquantes sont désormais déployées. Une requête distante a confirmé la présence de `oasis_is_super_admin()` et `oasis_bootstrap_owner(uuid)`, la RLS de la table propriétaire et l’absence de permission bootstrap pour `authenticated`. La création publique d’entreprise reste interdite.

Le compte Auth propriétaire est toujours absent après cette intervention : aucune création de compte ni modification de mot de passe effectuée. Le connecteur disponible n’offre pas de création Auth administrative et la clé serveur administrative n’est pas configurée dans ce checkout. Ne pas contourner cela par une insertion directe dans `auth.users`. Le provisionnement via API officielle doit être terminé depuis un environnement serveur de confiance, puis une connexion réelle doit être vérifiée.


## Rattachement propriétaire effectué

Le compte Auth a été créé et confirmé par l’utilisateur. Après autorisation explicite, le bootstrap existant a été exécuté par le canal SQL administratif Supabase, dans une transaction avec le contexte `service_role` limité à cette transaction. Aucun mot de passe ni contenu interne Auth n’a été modifié. La lecture de contrôle confirme :

- compte : `gnavakobenan@gmail.com`, email confirmé ;
- entreprise : OASIS LOGISTICS, identifiant `20c4d98f-8614-461f-b84b-fdf67aebb532` ;
- rôle métier : `admin`, capacité Super administrateur présente ;
- nom généré par le bootstrap : `Super administrateur OASIS LOGISTICS` ;
- téléphone du profil : non renseigné, en attente d’une valeur fournie par le propriétaire.

Le serveur qui héberge réellement l’API doit utiliser `OASIS_COMPANY_ID=20c4d98f-8614-461f-b84b-fdf67aebb532`. Cette configuration de déploiement n’a pas été modifiée dans cette intervention. Aucun login réel n’a été testé. L’état « compte absent » décrit plus haut était celui précédant cette étape et est désormais dépassé.


## Configuration de l’API de l’aperçu

`backend/.env` (ignoré par Git, permissions 0600) a été configuré avec l’URL du projet, sa clé publique, `OASIS_COMPANY_ID=20c4d98f-8614-461f-b84b-fdf67aebb532`, port 4000 et origine locale du frontend. Aucun mot de passe ni clé administrative n’a été ajouté. Les serveurs frontend 3000 et API 4000 ont démarré ; `/api/health` via le proxy frontend répond 200, et la validation locale de l’entreprise réussit. Une session anonyme reçoit bien 401.

**Blocage réseau restant :** l’appel du serveur à `/auth/v1/settings` sur Supabase échoue avec `ECONNRESET` dans ce sandbox. Le connecteur Supabase accède à la base par un autre canal ; sa réussite ne prouve pas l’accès HTTPS du serveur. La connexion réelle ne peut donc pas être déclarée fonctionnelle dans cet aperçu tant que cet accès réseau n’est pas disponible. Aucun réglage local ne modifie un éventuel hébergement externe. La clé administrative serveur reste nécessaire pour créer de nouveaux comptes depuis l’application, mais pas pour la connexion du propriétaire existant.
