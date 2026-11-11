# Modèle GLB livré — GESTION

`truck.glb` est un véritable modèle glTF 2.0 binaire autonome, **212 280 octets**, avec géométries, matériaux, roues nommées et textures PNG embarquées. Il ne nécessite ni texture distante ni décodeur Draco/KTX2. Il s’agit d’un modèle **low-poly stylisé**, pas d’un scan photoréaliste ni d’une reproduction certifiée d’un constructeur automobile.

## Provenance et licence

- Base : **Kenney — Car Kit 3.1**, modèle `truck.glb` (tracteur et roues).
- Page officielle, licence vérifiée le 11 novembre 2026 : https://kenney.nl/assets/car-kit
- Licence officielle : **Creative Commons Zero (CC0)**, usage commercial et modification autorisés : https://creativecommons.org/publicdomain/zero/1.0/
- Copie du texte fourni dans le pack : `KENNEY-LICENSE.txt`.
- Fichier téléchargé depuis le miroir GitHub, commit épinglé `153591d606970058a4d0e44aeadf435c2d3f89ed` : https://github.com/Arslan12216775/kenney_car-kit/blob/153591d606970058a4d0e44aeadf435c2d3f89ed/Models/GLB%20format/truck.glb
- SHA-256 de la source : `1c4cbf50087324c6033aae8b0950ff5f865245bd4f67033d1381d2185b10c721`.
- Source conservée hors des ressources publiques : `frontend/scripts/model-source/kenney-truck.glb`.

La base originale est un camion court, **pas un semi-remorque prêt à l’emploi**. L’adaptation locale ajoute une remorque longue nervurée, trois essieux (six roues réutilisant les maillages Kenney), un châssis, des protections, une cabine à couchette haute, des accents bleus et un logo OASIS LOGISTICS. La palette de carrosserie est repeinte en blanc ; les vitres et détails sont conservés. La remorque et les détails sont **précalculés dans le fichier GLB**, pas substitués par un dessin CSS ou générés à chaque rendu React.

Les ajouts géométriques et la texture typographique réalisés pour cet asset sont également mis à disposition sous CC0 ; cela ne change pas la licence du code de l’application ni ne concède de droits sur d’éventuelles marques. Les dimensions sont illustratives, pas une spécification mécanique.

SHA-256 final : `fde679a8496d1cc5c08fdb5e395951b5fe652827718e42f5d6e11a5a443c3468`.

## Régénération facultative

Le fichier est déjà livré et fonctionne sans Python. Pour le régénérer hors production : Python 3 et **Pillow 13.0.0** dans un environnement virtuel, puis :

```bash
python frontend/scripts/build-truck-model.py
```

Pillow n’est pas une dépendance frontend/backend et n’a pas été ajouté aux manifestes npm. Aucune connexion réseau n’est nécessaire au générateur : la source et le logo sont locaux.

## Remplacement par un modèle premium

Conserver `truck.glb`, un repère Y vertical / +Z avant, roues sur des nœuds `wheel-*` dont les pivots sont au centre des axes et rotation autour de X. Adapter le cadrage et `WHEEL_RADIUS` si les unités changent. Vérifier une licence explicite avant remplacement. Le modèle actuel est réellement intégré ; une future amélioration photoréaliste ne doit pas être annoncée comme déjà livrée.
