# Connexion 3D — Gestion

## Périmètre et dépendances

La stack `three`, `@react-three/fiber` et `@react-three/drei` était déjà déclarée **dans le frontend**. Aucune dépendance runtime ajoutée, aucun package backend installé, aucun changement des manifestes ou du lockfile npm. Le dépôt reste un workspace npm existant.

L’intégration adapte `AuthShell`, partagé par la connexion et ses retours OAuth/récupération, sans réécrire `Login.tsx`, les formulaires, les routes, le contexte de session ou le backend. Le nom existant `Login.tsx` est conservé plutôt que de créer un doublon `LoginPage.tsx`. L’ancienne scène `components/animations/TruckScene.tsx` reste utilisée par le dashboard : la nouvelle scène GLB est indépendante dans `components/login3d/TruckScene.tsx`.

## Modèle réellement livré

- Fichier : `frontend/public/models/truck.glb`, **251 220 octets**, glTF binaire 2.0.
- Environ **5 154 triangles** après instanciation, 101 nœuds, 10 maillages partagés, textures PNG/JPEG embarquées. Pas de téléchargement de décodeur, HDRI ou police à l’exécution.
- Source : Kenney Car Kit 3.1, licence **CC0**, vérifiée sur https://kenney.nl/assets/car-kit et dans le fichier de licence livré avec le pack.
- Copie téléchargée depuis un miroir GitHub à commit épinglé ; source originale, empreintes et licence conservées. Voir `frontend/public/models/README.md` et `KENNEY-LICENSE.txt`.
- La source est un camion court, pas un semi-remorque complet. L’adaptation locale ajoute une longue remorque nervurée, trois essieux supplémentaires, châssis/protections, couchette et carénage hauts, accents bleus et logo original OTL fourni. La carrosserie est repeinte en blanc.
- Ces adaptations sont **baked dans le GLB** par le générateur ; la scène charge le véritable asset avec `useGLTF`, pas une image ou un camion CSS. Le rendu est **low-poly stylisé**, pas photoréaliste, et les proportions restent illustratives.

## Scène et comportement

- `Canvas` plein fond dans le shell de connexion, route 3D, caméra perspective adaptative, éclairage ambiant/hémisphérique/directionnel et ombre portée.
- Déplacement lent en boucle dans `useFrame`, rotation X des nœuds `wheel-*` autour de leurs pivots. Delta borné pour éviter un bond après suspension de l’onglet.
- Résolution desktop plafonnée à DPR 1,5 ; mobile DPR 1, antialiasing et ombres désactivés. Shadow map desktop 512², sans ombres de contact recalculées coûteuses.
- `lazy` et `Suspense` isolent le chargement 3D : le formulaire ne dépend pas de la disponibilité du modèle. Un fond statique reste visible pendant le chargement.
- Le même fond statique prend le relais en cas d’absence WebGL2, erreur GLB, échec de rendu ou perte de contexte graphique. Aucun faux camion 2D n’est présenté comme une scène 3D.
- `prefers-reduced-motion`, la préférence d’animations existante et la visibilité de l’onglet contrôlent le mouvement. Quand il est arrêté, `frameloop="demand"` conserve une vue fixe.
- Carte glassmorphism avec contraste renforcé, inputs interactifs, couche 3D `pointer-events:none`, voile de lisibilité et fallback CSS opaque si le flou n’est pas pris en charge.

### Ressources

Les transformations du GLB sont clonées une seule fois par montage ; géométries, matériaux et textures sont partagés depuis le cache `useGLTF`. Ils ne sont pas détruits à chaque changement de route, afin de ne pas casser un remontage ou d’autres consommateurs du cache. Le cache contient un seul asset local et borné. Les objets de scène montés et les ressources de route sont libérés par R3F ; les écouteurs de redimensionnement, visibilité et perte de contexte sont retirés au démontage. Aucune allocation d’objet Three.js dans la boucle d’animation.

## Configurations nécessaires

Aucun nouveau paramètre d’environnement ni changement Supabase. L’hébergement doit distribuer le dossier public Vite et en particulier `models/truck.glb` (copié au build). Le chemin respecte `import.meta.env.BASE_URL`.

Le GLB est déjà présent : **Python n’est pas nécessaire pour démarrer ou builder l’app**. La régénération facultative de l’asset utilise Python 3 et Pillow 13.0.0 dans un environnement virtuel, à partir de la source CC0 locale. Aucun paquet Python n’est ajouté aux manifestes de l’application.

## Tests exécutés

- `npx --yes pnpm@10 run build` : réussi, backend et frontend, avec avertissement pnpm concernant le workspace npm existant. Aucun nouveau lockfile/workspace pnpm n’est conservé. Un premier essai pnpm 12 a tenté une installation automatique et signalé un script de build esbuild non approuvé ; les fichiers générés ont été supprimés et les dépendances restaurées depuis `package-lock.json` avec `npm ci` avant les validations finales.
- `npm run typecheck` : réussi frontend et backend.
- `npm run lint` : réussi.
- `npm test` : **84 tests réussis** (59 backend, 25 frontend), dont trois nouveaux tests de présence/structure GLB, contenu du modèle et bornes du mouvement.
- `npm run test:e2e` : réussi, contrôles existants de formulaire/erreurs, téléphone, récupération, callbacks, responsive, contraste et animations isolées du dashboard/chargement adaptés au nouveau fond.
- `node frontend/tests/truck3d.mjs` : **GLB réellement chargé et rendu** à 1440 et 390 px dans Chromium/SwiftShader. Formulaire utilisable pendant un téléchargement volontairement bloqué, DPR borné, mouvement réduit puis repris avec changement de pixels rendu, modèle absent, absence WebGL et perte de contexte testés. Captures ordinateur/mobile inspectées.

**Limites réelles :** SwiftShader est un rendu logiciel headless, pas un GPU physique de téléphone. La recette WebGL sur Android/iPhone réels et les mesures de mémoire/FPS prolongées restent à faire. Les tests Auth existants restent isolés ; aucune connexion réussie à un vrai compte, aucun consentement Google ou email de récupération réel n’est revendiqué. Aucune règle de sécurité, aucun rôle, aucune table ni politique RLS modifiés.

## Fichiers créés

- `frontend/src/components/login3d/TruckScene.tsx`
- `frontend/src/components/login3d/TruckBackground.tsx`
- `frontend/src/components/login3d/motion.ts`
- `frontend/public/models/truck.glb`
- `frontend/public/models/KENNEY-LICENSE.txt`
- `frontend/public/models/README.md`
- `frontend/scripts/model-source/kenney-truck.glb`
- `frontend/scripts/build-truck-model.py`
- `frontend/tests/browser.mjs` (lancement Chromium partagé)
- `frontend/tests/truck3d.mjs`
- `frontend/tests/truckAsset.test.ts`
- `docs/LOGIN-3D.md`

## Fichiers modifiés

- `frontend/src/components/auth/AuthShell.tsx` : branchement du fond GLB, retrait de l’illustration fixe de cette page seulement.
- `frontend/src/assets/login.css` : plein fond, transparence/flou et lisibilité, styles limités au shell Auth.
- `frontend/tests/smoke.mjs` : contrôles adaptés et réutilisation du lanceur de navigateur.
- `docs/ETAT-DU-PROJET.md` : état de cette évolution et limites.

## Commandes

```bash
npm ci
npm run dev
# Avec les serveurs actifs sur les ports 3000 / 4000 :
npm test
npm run test:e2e
node frontend/tests/truck3d.mjs
npx --yes pnpm@10 run build
```
