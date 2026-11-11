# Installation privée OASIS LOGISTICS

L’interface porte désormais le nom OASIS LOGISTICS. L’inscription publique et la création libre d’entreprises ont été supprimées de l’interface et sont refusées par l’API. Les comptes non rattachés voient une demande de contact administrateur, sans création d’entreprise.

## Mise en service obligatoire

- Configurer `OASIS_COMPANY_ID` dans `backend/.env` avec le **véritable UUID** de l’entreprise OASIS LOGISTICS. Aucun UUID n’est deviné ou choisi depuis le navigateur. Sans ce paramètre, l’API refuse les accès métier (503), plutôt que d’ouvrir l’application à une autre entreprise.
- Provisionner le premier administrateur et l’entreprise depuis un canal administratif de confiance. Les membres suivants doivent avoir un compte confirmé et être rattachés par un administrateur. La fonction existante `gestion_set_member` conserve ses contrôles de rôle.
- Appliquer `supabase/migrations/20261111210000_oasis_private_access.sql` : elle révoque l’appel public/authentifié à la création d’entreprise sans supprimer de données ni modifier les politiques RLS existantes.
- Désactiver l’inscription publique dans la configuration Supabase Auth : le blocage de `/api/auth/register` ne désactive pas à lui seul le point d’entrée Auth direct de Supabase.

**La migration et la configuration Auth distante ne sont pas appliquées par cette modification de code.** Le contrôle UUID protège les routes métier de cette API, pas tous les clients possibles de Supabase. La fermeture de l’installation distante doit être vérifiée après ces étapes. Ne pas annoncer une isolation mono-entreprise distante entièrement validée avant cette recette.

## Visuels

Camion illustré en SVG détaillé (cabine, rétroviseur, marchepied, réservoir, calandre, cinq essieux, moyeux et conteneur nervuré) disponible sans réseau externe ou GPU. Les variantes 20 DRY, 40 DRY et 40 REEFER sont conservées. La scène 3D gagne des détails mécaniques et une allure plus lente. Les préférences de désactivation et de réduction des animations restent respectées. Il s’agit d’un rendu procédural/illustré, pas d’une photographie.
