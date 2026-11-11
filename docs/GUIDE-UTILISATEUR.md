# Guide utilisateur — GESTION

## Bien démarrer

1. Créer et confirmer son compte. Se connecter.
2. Pour une nouvelle entreprise, saisir son nom complet et la raison sociale. Pour rejoindre une équipe, attendre le rattachement par l’administrateur, puis cliquer « Vérifier mon rattachement ».
3. Ajouter les chauffeurs avec leurs documents, puis les camions. Un compte utilisateur chauffeur peut être associé à sa fiche pour lui donner accès à ses missions.
4. Configurer la grille tarifaire pour chaque combinaison terminal / conteneur / état / shift. Aucun tarif n’est inventé automatiquement.

## Enregistrer un voyage

Sélectionner le camion, chauffeur, date et heure d’Abidjan, terminal, conteneur et état. L’application calcule le shift et propose les tarifs actifs correspondants. Confirmer avant l’enregistrement. Chaque ligne représente **un voyage**. Le tarif retenu est conservé même si la grille change ensuite.

- 06h00 à 18h30 inclus : jour.
- Après 18h30 et avant 19h00 : hors shift, saisie rejetée.
- 19h00 à minuit : soir du jour courant.
- Minuit à 05h59 : soir de la veille.
- À 06h00 : nouveau shift jour.

La saisie rapide garde les sélections du voyage précédent. Ajuster l’heure réelle (secondes disponibles), le camion ou les autres informations avant de confirmer le suivant. Un doublon strict est refusé, pas compté deux fois.

## Dépenses et justificatifs

Saisir une dépense payée : date, catégorie, montant entier FCFA, description et associations facultatives. Un voyage lié impose le camion, chauffeur et shift de ce voyage. Les charges générales restent non affectées.

L’icône d’envoi permet d’ajouter un PDF, JPEG ou PNG de 5 Mo maximum. Les documents sont privés ; « Consulter » génère un téléchargement temporaire. Une dépense survit à la suppression de son voyage, sans lien vers l’élément supprimé.

## Lire les finances

Recettes = somme des tarifs historiques des voyages. Dépenses = sommes payées enregistrées. Bénéfice d’exploitation = recettes − dépenses. Ce résultat ne représente pas une trésorerie bancaire, une déclaration fiscale ou un bilan comptable complet.

Les filtres de dates des voyages utilisent la date comptable du shift. Les dépenses utilisent leur propre date de paiement. Les filtres terminal/conteneur/état des rapports n’incluent que les dépenses liées aux voyages correspondants. Les charges générales ne sont pas réparties artificiellement entre camions ou shifts.

## Rapports et préférences

Choisir une période et les filtres, puis exporter Excel ou PDF depuis les finances. Les fichiers comportent la synthèse, les voyages, les dépenses et les ventilations disponibles. Les camions du rapport suivent les filtres de flotte ; le filtrage de période ne supprime pas du parc un camion sans voyage.

Les paramètres permettent de modifier le profil, l’entreprise (administrateur), le mot de passe, le thème et l’animation. Les réglages métier protégés sont accessibles par les liens de configuration. Les notifications peuvent être marquées lues ; l’audit reste une trace non modifiable des opérations.
