# Frontend

Navigation : vue d’ensemble, camions, voyages/shifts, dépenses, finances/rapports, paramètres.

Design : palette vert émeraude et blanc cassé, navigation latérale, cartes d’indicateurs, graphique en barres CSS, listes tabulaires et formulaires en modale. Les tableaux défilent horizontalement sur mobile. Le menu devient rétractable sous 700 px.

Les animations d’apparition et de progression respectent `prefers-reduced-motion`. Les modales portent un nom accessible, retiennent le focus, se ferment avec Échap et restituent le focus. Les champs sont associés à leurs labels.

Les modifications sont automatiquement sauvegardées localement. Les données initiales sont fictives. En cas de stockage indisponible ou de données corrompues, l’interface avertit l’utilisateur et évite de réécrire les données existantes jusqu’à réinitialisation ou restauration explicite.
