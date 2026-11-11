# Architecture GESTION

## Décisions

- Remplacement du prototype Next.js par deux applications séparées React/Vite et Express. L’ancien code est conservé dans `archive/next-prototype`, exclu du build et du lint actifs.
- PostgreSQL Supabase est l’unique source de vérité des opérations. Pas de fallback local, pas d’import silencieux de la démonstration.
- Pas de service-role dans l’application, y compris côté API : chaque requête utilise une clé publiable et un access token vérifié par Supabase Auth. La RLS reste donc active, même si un utilisateur appelle directement PostgREST.
- Une personne est membre d’une seule entreprise dans cette première version ; une entreprise peut avoir plusieurs membres et rôles.
- Montants unitaires entiers de 1 à 10^12 FCFA. Les totaux serveur utilisent BigInt et sont renvoyés sous forme de chaînes décimales pour éviter les erreurs de précision. Les graphiques sont des visualisations en flottants, pas la source comptable.

## Frontend

`routes/App.tsx` protège l’espace et route les modules. `SessionContext` ne stocke aucun secret navigateur. TanStack Query gère les données réelles et invalide les caches après mutation. Les formulaires React Hook Form/Zod sont pilotés par une configuration de ressources réutilisable. Les composants de graphique, modale, filtres et animation sont séparés.

Les scènes R3F/Three/Drei sont importées à la demande. Le modèle est créé avec des géométries originales : aucune dépendance à un fichier GLB inexistant ni à une licence externe. La qualité est limitée (DPR ≤ 1,5, ombres 512), avec fallback CSS sur appareil peu puissant/mobile ou sans WebGL. Roues et déplacement sont réellement animés. La préférence système et le réglage applicatif peuvent arrêter les mouvements.

## Backend

- `config` : environnement validé et client Supabase par requête.
- `middlewares` : authentification distante, renouvellement et permissions d’entreprise.
- `controllers` : opérations génériques sur une liste fermée de ressources.
- `routes` : auth, rapports, documents, membres et métadonnées.
- `services` : requêtes filtrées, extraction des rapports, génération Excel/PDF et cookies.
- `validators` : listes blanches Zod et filtres.
- `utils` : shifts, totaux exacts et gestion des erreurs.

Toutes les mutations nécessitent `X-Gestion-Client: web`, refusent une origine étrangère et utilisent des cookies HttpOnly SameSite=Lax (Secure en production). Les tentatives d’authentification et l’API sont limitées par IP. Le proxy n’est pas implicitement considéré fiable : adapter la configuration `trust proxy` uniquement à une infrastructure de confiance si nécessaire. Les erreurs retournées ne contiennent ni jetons ni détails SQL internes ; les violations métier attendues sont traduites en 4xx.

## Modèle et autorisations

Les colonnes `company_id` sont forcées par l’API et vérifiées par la RLS. Les relations entre objets utilisent des clés étrangères composites pour empêcher une référence interentreprise. Les profils n’accordent des droits UPDATE que sur le nom et le téléphone. Les rôles ne sont pas modifiables par une simple mutation de profil ou des métadonnées Auth.

Les fonctions SECURITY DEFINER ont un search_path vide et des droits EXECUTE limités. Elles servent uniquement au contexte d’entreprise, à la création atomique d’entreprise, au rattachement administrateur, à l’audit et à la synchronisation de dépenses liées. Les autres validations s’exécutent avec les droits de l’utilisateur.

Les modifications de rôle sont journalisées. Un administrateur ne peut modifier son propre rôle via la fonction de gestion de membres. Les invitations par e-mail ne sont pas automatisées : le membre doit exister et avoir confirmé son compte.

## Limites

Les rapports parcourent les données par pages jusqu’à 100 000 lignes par registre, puis demandent une période plus courte. À grande échelle, remplacer les extractions mémoire par des agrégations SQL paginées et des exports asynchrones. Un exercice de déploiement, une vérification Auth réelle et une revue sécurité indépendante sont nécessaires avant production.
