# Logo officiel OTL

`otl-logo.jpg` est le fichier original fourni par le propriétaire du projet (image 2 de sa demande). Dimensions : 1280 × 640 pixels, fond blanc d’origine. Aucun redessin ni modification des couleurs ; le fichier original n’est pas détouré.

SHA-256 : `023e725000d830e9f7df5994e795aede89baf599543f7256efd0b46f9a73c671`.

- Copie frontend identique : `frontend/public/branding/otl-logo.jpg`.
- Le générateur GLB utilise ce JPEG intact, et non une reproduction textuelle.
- Les exports PDF et Excel lisent ce fichier depuis le backend (sources et build).
- Déployer **ce dossier shared/branding** avec le backend en conservant sa position à la racine du dépôt ; il n’est pas copié par TypeScript.

Le logo est une marque fournie par l’utilisateur, **pas un asset CC0**. La licence CC0 du modèle Kenney ne s’applique pas au logo. Pour la carte de connexion posée sur le verre, une déclinaison détourée est dérivée de ce JPEG : `frontend/public/branding/otl-logo.png` (fond blanc rendu transparent, mêmes couleurs, aucun redessin). Le reste de l’application et les exports continuent d’utiliser le JPEG original intact.
