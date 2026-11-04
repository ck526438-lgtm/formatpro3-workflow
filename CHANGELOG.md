# Journal des modifications

Toutes les évolutions notables du projet sont consignées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) — versions : [SemVer](https://semver.org/lang/fr/).

## [Non publié]

## [1.1.0] — 2026-11-04

### Ajouté
- **Tests unitaires** (Vitest, 47 tests) : expressions `{{ … }}`, ordre topologique, détection de boucle,
  branches Condition / Aiguillage, nœuds de données, IA locale, validité du catalogue et des 6 modèles.
- **Lint** avec oxlint (`npm run lint`) et script global `npm run check`.
- CI : typage, lint et tests sur Node 22 et 24 avant le build.
- Fichiers communautaires : `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, modèles d'issues et
  de pull request, Dependabot, `.editorconfig`, `.nvmrc`.
- Métadonnées npm : dépôt, page d'accueil, mots-clés, version minimale de Node.

### Corrigé
- Une chaîne qui **commence et finit par une expression** (`{{ $json.prenom }} {{ $json.nom }}`) n'était
  pas résolue : elle était prise pour une seule expression invalide et renvoyée telle quelle. Touchait
  notamment la légende du modèle « publication vidéo multi-réseaux ».
- Imports et variables inutilisés dans le moteur.

## [1.0.0] — 2026-10

### Ajouté
- Éditeur de workflows par nœuds (canvas infini, minimap, alignement automatique, notes autocollantes,
  menu contextuel, palette de commandes `Ctrl K`, annuler / rétablir, import / export JSON).
- 44 nœuds en 7 familles, moteur d'exécution réel avec expressions `{{ … }}` et « exécuter jusqu'ici ».
- Publication vidéo sur 7 réseaux (YouTube, Mastodon, Bluesky, X, Instagram Reels, Facebook, TikTok).
- Relais local `server.mjs` sans dépendance, gestionnaire d'identifiants, 6 modèles prêts à l'emploi.
- Guide d'utilisation PDF de 18 pages, démo GitHub Pages déployée automatiquement.

[Non publié]: https://github.com/ck526438-lgtm/formatpro3-workflow/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/ck526438-lgtm/formatpro3-workflow/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ck526438-lgtm/formatpro3-workflow/releases/tag/v1.0.0
