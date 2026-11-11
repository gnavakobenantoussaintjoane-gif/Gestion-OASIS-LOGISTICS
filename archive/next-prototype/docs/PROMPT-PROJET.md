# Prompt professionnel — OASIS Transport & Logistics

> Ce cahier des charges peut être copié dans un outil de développement IA. La version actuelle couvre le prototype local décrit ci-dessous. La partie production est une étape ultérieure, non encore implémentée.

## Prompt à copier

Tu es un développeur full-stack senior et un designer produit. Conçois une petite application web professionnelle, en français, nommée **OASIS Transport & Logistics**, destinée à une entreprise de transport de conteneurs à Abidjan. Je veux piloter mes camions, mes voyages par shift, mes recettes, mes encaissements et mes dépenses en francs CFA (XOF).

### 1. Design et expérience

Créer une interface haut de gamme, claire et sobre : fond blanc cassé, vert émeraude, accents de couleur discrets, typographie lisible, cartes d’indicateurs, navigation latérale et tableaux soignés. Prévoir une interface mobile utilisable, des états vides, des validations et confirmations de suppression. Utiliser des animations légères (apparition, transitions, survol), sans ralentir l’application. Respecter les préférences de réduction du mouvement et l’accessibilité clavier. Aucun bouton décoratif ne doit donner l’impression d’une fonctionnalité inexistante.

### 2. Camions

Permettre d’ajouter et modifier un camion : immatriculation unique, chauffeur, statut (disponible, en mission, maintenance). Présenter ses voyages, recettes et dépenses. Ne pas supprimer un camion qui possède un historique d’opérations.

### 3. Voyages et shifts

Pour chaque ligne, saisir :

- date de départ et camion ;
- shift **jour, de 06h00 à 18h30**, ou **soir, de 19h00 à 06h00 le lendemain** ;
- terminal : **ATL — Abidjan Terminal** ou **CIT — Côte d’Ivoire Terminal** ;
- conteneur : **20 pieds DRY**, **40 pieds DRY** ou **40 pieds REEFER** ;
- état : **plein** ou **vide** ;
- nombre entier de voyages et prix unitaire en FCFA ;
- montant encaissé, compris entre zéro et le total de la ligne.

Une ligne représente plusieurs voyages strictement homogènes. Si le camion, shift, terminal, conteneur, état ou tarif change, créer une autre ligne. Le shift soir appartient à sa **date de départ**, même s’il finit le lendemain.

Calculer automatiquement : `recette = nombre de voyages × prix unitaire`. Permettre la modification et la suppression avec confirmation. Afficher les paiements non encaissés, partiels et complets.

### 4. Dépenses

Enregistrer date de paiement, catégorie, description et montant : carburant, entretien, péage, salaire/prime, manutention, autre. Une dépense peut être générale, liée à un camion, ou liée à une ligne de voyages. Le camion d’une dépense liée doit correspondre à celui du voyage. Conserver les dépenses si le voyage lié est supprimé, en retirant seulement leur affectation.

### 5. Finances et tableau de bord

Afficher sans confusion :

- chiffre d’affaires = somme des recettes calculées ;
- encaissements = sommes déclarées reçues ;
- reste à encaisser = chiffre d’affaires − encaissements ;
- dépenses = sommes payées enregistrées ;
- résultat d’exploitation simplifié = chiffre d’affaires − dépenses ;
- trésorerie nette simplifiée = encaissements − dépenses ;
- nombre de voyages = somme des quantités, et non nombre de lignes.

Présenter un graphique recettes/dépenses, la répartition jour/soir, les derniers voyages et les dépenses par catégorie. Indiquer explicitement que ce suivi ne remplace pas une comptabilité.

### 6. Filtres

Combiner dates inclusives, camion, shift, terminal, type de conteneur et état plein/vide, ainsi qu’une recherche textuelle. Tous les indicateurs et exports doivent refléter la sélection. Sans filtre spécifique de voyage, inclure les dépenses générales. Avec un filtre shift/terminal/conteneur/état, retenir uniquement les dépenses liées aux voyages correspondants et le signaler clairement.

### 7. Exports et sauvegarde

Exporter en **vrai fichier Excel .xlsx** et en **PDF** : synthèse, voyages, dépenses et parc de camions. Afficher la devise et la période. Distinguer les données filtrées du parc complet. Fournir une sauvegarde JSON et une restauration validée avec confirmation avant remplacement. Ne pas accepter de références orphelines, de doublons ou de montants invalides.

### 8. Réalisation progressive

**Étape A — prototype local :** Next.js App Router, React, TypeScript strict, CSS responsive, Lucide, ExcelJS et jsPDF. Données de démonstration clairement signalées, persistance locale et avertissement sur l’absence de synchronisation. Ne pas présenter cette version comme sécurisée pour une utilisation multiutilisateur.

**Étape B — production, après validation du prototype :** intégrer Supabase avec authentification, rôles et règles RLS, données séparées par entreprise, validation serveur, migrations et sauvegardes. Ajouter une table de paiements datés pour une véritable trésorerie par date d’encaissement, une piste d’audit et une grille tarifaire configurable. Ne jamais exposer la clé `service_role` au navigateur. Définir et tester les droits avant de déployer.

### 9. Qualité attendue

Écrire des tests des calculs et filtres, de la validation des sauvegardes et des parcours essentiels : ajout, modification, suppression, persistance, exports et mobile. Vérifier TypeScript, lint et compilation. Documenter les limitations réelles et fournir un README de démarrage. Ne pas inventer de règles tarifaires officielles : les montants de démonstration sont fictifs et les tarifs réels sont saisis par l’utilisateur.
