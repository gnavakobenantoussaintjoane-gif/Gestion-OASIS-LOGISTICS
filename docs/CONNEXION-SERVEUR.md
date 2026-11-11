# Connexion OASIS LOGISTICS : configuration et réseau

## Diagnostic effectué

Le message « Le serveur ne parvient pas à joindre Supabase » correspond à un échec de transport Auth, pas à une preuve de mot de passe incorrect. Ne pas supprimer ce contrôle, simuler une connexion ni désactiver TLS/RLS pour le masquer.

Dans l’environnement d’aperçu :

- entreprise et URL du projet configurées dans `backend/.env` ignoré par Git ;
- résolution DNS du domaine Supabase réussie ;
- appel HTTPS réel à `/auth/v1/settings` : échec `ECONNRESET` ;
- vérification via le connecteur de gestion : Auth, REST et DB signalés sains.

Le canal du connecteur est distinct de celui de l’API Node. Le sandbox limite les destinations sortantes et le domaine Supabase ne fait pas partie des destinations accessibles. Aucun changement de mot de passe, de rôle ou de nom d’application ne débloque cette restriction. La connexion réelle reste non validée.

## Sur le serveur qui héberge réellement l’API

Configurer les variables suivantes dans le gestionnaire d’environnement de l’hébergement (ou `backend/.env` pour un lancement depuis les sources) :

```dotenv
SUPABASE_URL=https://nrwfnqtomyamswirrhqv.supabase.co
SUPABASE_PUBLISHABLE_KEY=<clé publique du projet>
OASIS_COMPANY_ID=20c4d98f-8614-461f-b84b-fdf67aebb532
FRONTEND_ORIGIN=https://<origine-exacte-du-frontend>
NODE_ENV=production
PORT=4000
```

Ne pas mettre une clé `service_role` dans le frontend. Elle n’est pas nécessaire pour connecter un utilisateur existant ; les opérations administratives de création de comptes la nécessitent côté serveur uniquement.

1. Autoriser DNS et la sortie **HTTPS/443 vers `nrwfnqtomyamswirrhqv.supabase.co`** dans la politique réseau de l’hébergement. Conserver la validation des certificats TLS.
2. Depuis ce même serveur, installer les dépendances du dépôt puis lancer :

   ```bash
   npm run check:supabase -w backend
   ```

   La commande ne demande ni mot de passe utilisateur ni clé administrative. Elle vérifie DNS puis l’accès Auth avec la clé publique configurée ; elle retourne un code non nul en cas d’échec. Elle ne prouve pas une connexion utilisateur réussie.
3. Redémarrer l’API après mise à jour des variables.
4. Conserver le reverse proxy frontend `/api` vers l’API, sur la même origine HTTPS que le site. Ne jamais utiliser localhost comme URL d’API dans le navigateur d’un utilisateur distant.
5. Effectuer une connexion réelle avec le compte propriétaire confirmé, sans transmettre son mot de passe dans le chat.

L’URL et le nom de l’hébergeur externe n’ont pas été fournis : aucune configuration de production externe n’a été effectuée. Les variables de cet aperçu ne se propagent pas sur un autre serveur et ne sont pas sauvegardées dans Git.

## Identité visuelle

La connexion, le footer, le libellé accessible et la texture embarquée du camion affichent désormais **OASIS LOGISTICS**. Les identifiants techniques `gestion-*`, le nom du dépôt et l’en-tête de sécurité `X-Gestion-Client` sont conservés pour ne pas casser les contrats existants. Les mots métier « gestion de flotte » et le rôle « Gestionnaire » restent inchangés.

## Validation de cette évolution

- TypeScript, lint et build : réussis.
- 84 tests unitaires : réussis.
- Smoke navigateur et GLB desktop/mobile : réussis ; captures inspectées.
- Diagnostic réseau : échec attendu et correctement signalé (`ECONNRESET`), DNS OK.
- Aucun test de connexion réussie à un compte réel revendiqué.
