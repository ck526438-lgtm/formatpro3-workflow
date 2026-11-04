# Contribuer à FormatPro3 Workflow

Merci de votre intérêt ! Ce guide explique comment proposer un correctif ou une nouveauté.

## Prérequis

- **Node.js 22.12+** (voir `.nvmrc`)
- npm 10+

```bash
git clone https://github.com/ck526438-lgtm/formatpro3-workflow.git
cd formatpro3-workflow
npm install
npm run dev        # http://localhost:5173
npm start          # (optionnel) relais local sur http://127.0.0.1:5174
```

## Avant d'ouvrir une pull request

```bash
npm run check      # typage + lint + tests — exactement ce que lance la CI
npm run build      # build de production
```

| Script | Rôle |
| --- | --- |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run lint` | Lint avec [oxlint](https://oxc.rs) (`.oxlintrc.json`) |
| `npm test` | Tests unitaires [Vitest](https://vitest.dev) (dossier `tests/`) |
| `npm run test:watch` | Tests en mode surveillance |

## Flux de travail

1. Créez une branche depuis `main` : `git checkout -b feat/mon-noeud` ou `fix/expression-vide`.
2. Faites des commits courts et explicites (en français), par exemple :
   `feat(noeuds): ajoute le nœud Airtable`, `fix(moteur): …`, `docs: …`, `test: …`.
3. Ajoutez ou mettez à jour les tests quand vous touchez au moteur (`src/engine/`) ou au catalogue.
4. Mettez à jour `CHANGELOG.md` (section « Non publié ») et, si besoin, le README.
5. Ouvrez la pull request en remplissant le modèle.

## Ajouter un nœud

1. Déclarez-le dans `src/data/catalog.tsx` (type unique, catégorie, icône, paramètres, ports).
2. Ajoutez son `case` dans `runNodeCore` (`src/engine/engine.ts`) — ou dans `src/engine/video.ts` pour la vidéo.
3. Règle d'or du projet : **zéro simulation**. Un nœud fait une action réelle ou échoue avec un message
   clair (et le lien où créer la clé manquante).
4. Ajoutez un test dans `tests/engine.test.ts` si le nœud fonctionne sans réseau.
5. Le test du catalogue vérifie le nombre de nœuds : mettez-le à jour, ainsi que le README et le guide.

## Style de code

- TypeScript strict, composants React fonctionnels, état global dans `src/store/store.ts` (zustand).
- Indentation 2 espaces, guillemets simples, points-virgules (voir `.editorconfig`).
- Interface et messages d'erreur **en français**.
- Ne commitez jamais de clé API : les identifiants restent dans le `localStorage` de l'utilisateur.

## Signaler un bug ou une faille

- Bug ou idée : ouvrez une [issue](https://github.com/ck526438-lgtm/formatpro3-workflow/issues/new/choose).
- Faille de sécurité : **pas d'issue publique**, suivez [SECURITY.md](SECURITY.md).

En contribuant, vous acceptez que votre code soit publié sous [licence MIT](LICENSE) et vous vous engagez
à respecter le [code de conduite](CODE_OF_CONDUCT.md).
