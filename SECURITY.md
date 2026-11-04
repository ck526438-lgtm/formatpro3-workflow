# Politique de sécurité

## Versions prises en charge

| Version | Correctifs de sécurité |
| --- | --- |
| 1.x | ✅ |
| < 1.0 | ❌ |

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique pour une faille.

Utilisez le signalement privé de GitHub :
**Security → Report a vulnerability** sur
[ck526438-lgtm/formatpro3-workflow](https://github.com/ck526438-lgtm/formatpro3-workflow/security/advisories/new).

Indiquez si possible : la version ou le commit concerné, les étapes de reproduction, l'impact estimé et une
piste de correctif. Vous recevrez un accusé de réception sous 72 h, puis un suivi jusqu'à la publication du
correctif.

## Modèle de sécurité — à savoir

- **Données locales** : flux et identifiants sont stockés dans le `localStorage` du navigateur, en clair.
  N'utilisez pas FormatPro3 Workflow sur un poste partagé avec des clés de production.
- **Nœud Code JS et expressions `{{ … }}`** : exécutés avec `new Function` dans votre navigateur.
  N'importez jamais un flux JSON dont vous ne comprenez pas le code — il peut lire vos identifiants.
- **Relais local** (`npm start`) : écoute uniquement sur `127.0.0.1`. Ne l'exposez pas sur un réseau
  (pas de `0.0.0.0`, pas de tunnel public) : il relaie des requêtes HTTP arbitraires.
- **Publication vidéo** : utilisez des jetons au périmètre minimal (`youtube.upload`, mots de passe
  d'application Bluesky…) et révoquez-les après usage.
