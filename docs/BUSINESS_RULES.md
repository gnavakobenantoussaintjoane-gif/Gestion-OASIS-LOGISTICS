# Règles métier GESTION

- XOF et Africa/Abidjan (UTC+0). Un voyage unitaire est une seule recette, issue d’un tarif actif et copiée historiquement.
- Date comptable calculée selon le shift de départ ; minuit à 05h59 appartient au soir de la veille. 06h00 est jour. 18h30 exacte est jour ; après 18h30:00 et avant 19h00, hors shift.
- Pas de tarif libre inventé ni de tarif fictif de secours. L’administrateur configure les prix avant la saisie des voyages.
- Un camion archivé/en maintenance/hors service ou un chauffeur inactif ne peut être utilisé pour un nouveau voyage. Une opération historique peut rester consultable après changement de statut.
- Doublon strict : même entreprise, camion, timestamp, terminal, conteneur et état. Un deuxième voyage réel demande son propre timestamp.
- Une dépense est considérée payée à sa date. Son lien au voyage synchronise camion, chauffeur et shift. Suppression du voyage : dépense conservée, lien retiré.
- Archives des camions pour conserver l’historique. Suppressions physiques des autres références protégées par clés étrangères lorsqu’elles sont utilisées.
- Recettes = somme des tarifs historiques. Dépenses = somme des montants payés. Bénéfice simplifié = recettes − dépenses. Totaux exacts BigInt côté serveur, sérialisés en chaînes décimales.
- Les filtres ne s’appliquent qu’aux champs présents dans le registre. Les filtres de terminal/conteneur/état des rapports excluent les dépenses non affectées aux voyages correspondants.
- Pas de comptabilité de TVA, amortissements, paiements clients ni gestion bancaire dans cette version.
