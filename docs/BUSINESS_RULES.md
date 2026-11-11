# Règles métier

1. Devise XOF, montants entiers positifs, encaissement autorisé à zéro. Pas de calcul de TVA ni de tarification officielle.
2. Chaque ligne regroupe un nombre entier de voyages homogènes : même camion, date, shift, terminal, conteneur, état et prix.
3. Recette = quantité × tarif. Le nombre de voyages est la somme des quantités.
4. Jour : 06h00–18h30. Soir : 19h00–06h00 J+1. Date du shift soir = date de départ.
5. Encaissement ≤ recette. Pas de journal de paiements séparé : encaissement rattaché à la date du voyage.
6. Dépenses considérées payées à leur date. Affectation facultative au camion ou au voyage. Une affectation au voyage impose son camion. Une modification du camion du voyage reporte ce camion sur ses dépenses liées.
7. Supprimer un voyage conserve les dépenses et retire leur lien au voyage. Un camion utilisé par un voyage ou une dépense ne peut être supprimé.
8. Résultat simplifié = recettes − dépenses ; trésorerie simplifiée = encaissements − dépenses ; reste dû = recettes − encaissements.
9. Dates de filtres inclusives. Les dépenses sont filtrées selon leur propre date. Les filtres spécifiques aux voyages (shift, terminal, conteneur, plein/vide) excluent les charges non affectées aux voyages correspondants. La recherche textuelle s’applique aux champs propres à chaque registre.
10. Les exports financiers et de voyages suivent les filtres ; le parc exporté reste complet. La courbe montre les sept jours se terminant à la date de fin sélectionnée ou à aujourd’hui.
11. Les sauvegardes sont validées : structure, montants, dates, unicité des identifiants/plaques, références camions/voyages. Une restauration remplace l’ensemble des données après confirmation.
