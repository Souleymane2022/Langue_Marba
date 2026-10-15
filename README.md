# Vun Marbana — apprendre et utiliser la langue Marba avec l'IA

Application web (installable sur téléphone, utilisable hors-ligne) pour **apprendre la langue Marba du Tchad** et
**l'utiliser dans les secteurs de base** : santé, éducation, agriculture, élevage, commerce, administration, justice, culture…

Elle est construite à partir du *Dictionnaire Marba* (Akaki) : **2 230 mots, 3 246 phrases d'exemple, 339 proverbes**.

➡️ Liste complète des fonctionnalités : [`docs/FONCTIONNALITES.md`](docs/FONCTIONNALITES.md)

## En bref

| Module | Ce qu'il fait |
|---|---|
| 📖 Dictionnaire | Marba ⇄ français, recherche sans clavier spécial, exemples, favoris, enregistrement de la prononciation |
| 🎯 Apprendre | 16 parcours thématiques, leçons, quiz, révision espacée, cartes mémoire |
| 🏥 Secteurs | vocabulaire et phrases par secteur, lexiques imprimables, dialogues et messages de sensibilisation par l'IA |
| ✨ Assistant IA | tuteur, traducteur, correcteur, dialogues, fiches pédagogiques, exercices, proverbes, grammaire |
| 🔁 Traduire | mot à mot hors-ligne + traduction complète par l'IA |
| 🪶 Proverbes | 339 proverbes, explications par l'IA |
| 🤝 Contribuer | proposer des mots, corrections, enregistrements audio ; export pour le comité de langue |
| 📈 Progrès | points, séries, badges, sauvegarde |

## L'IA, honnêtement

Le Marba est une langue peu documentée : aucun modèle d'IA ne la connaît vraiment. L'assistant (Gemini de Google — clé gratuite — ou Claude d'Anthropic)
est donc **ancré dans le dictionnaire** : il reçoit à chaque requête le lexique complet et les phrases authentiques les plus
pertinentes, a pour consigne de ne jamais inventer de mot, affiche un **niveau de confiance** (🟢 attesté, 🟡 assemblé,
🔴 incertain) et rappelle de faire valider par un locuteur natif tout texte destiné au public (santé, justice, radio).

### Activer l'IA gratuitement avec Gemini

1. Ouvrir https://aistudio.google.com/apikey, se connecter avec un compte Google, cliquer sur **Create API key**
   (gratuit, sans carte bancaire) et copier la clé.
2. Dans l'application : **Assistant IA → ⚙️ Réglages de l'IA**, coller la clé, **Enregistrer**.

La clé reste sur l'appareil et l'application appelle Google directement depuis le navigateur : cela fonctionne
**même sur GitHub Pages**, sans serveur. Chaque personne qui veut utiliser l'IA met sa propre clé gratuite.

**Voix.** Avec la clé Gemini, l'assistant **parle** avec une voix naturelle de Google (voix posées au choix : Charon,
Kore…), et l'on peut **lui parler** au micro (bouton 🎙️ Parler). Le *mode vocal* lit chaque réponse automatiquement et
envoie la question dès que l'on a fini de parler. Si le quota gratuit de la voix est épuisé, la voix du téléphone prend
le relais. Aucune voix de synthèse ne connaît encore le Marba : les mots Marba sont prononcés d'après leur orthographe ;
les enregistrements de locuteurs natifs restent la référence.

Limites de l'offre gratuite : nombre de questions par jour limité, et Google peut utiliser les textes envoyés pour
améliorer ses services — ne pas y mettre d'informations personnelles (noms de patients, etc.).
Le modèle par défaut est `gemini-flash-latest` (toujours la version Flash la plus récente) ; on peut en choisir un autre
dans les réglages.

## Démarrer

Prérequis : Node.js 20+ (et Python 3 uniquement pour régénérer les données).

```bash
npm install
cp .env.example .env.local      # facultatif : GEMINI_API_KEY ou ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

Sans clé côté serveur, tout fonctionne ; l'assistant IA s'active alors avec une clé Gemini personnelle dans les réglages.

```bash
npm test          # tests unitaires (recherche, révision espacée, quiz, secteurs, contexte IA)
npm run typecheck
npm run build && npm start
```

### Publication sur GitHub Pages (gratuit)

Adresse : **https://souleymane2022.github.io/Langue_Marba/**

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »** (une seule fois).
2. C'est tout : à chaque `git push`, le workflow `.github/workflows/github-pages.yml` teste, construit et publie le site
   (onglet **Actions** pour suivre ; bouton **Run workflow** pour relancer à la main).

GitHub Pages n'héberge que des fichiers statiques : tout fonctionne (dictionnaire, leçons, quiz, secteurs, proverbes,
traduction mot à mot, mode hors-ligne). L'assistant IA y fonctionne avec la **clé Gemini gratuite** de chaque
utilisateur (voir plus haut).

Pour offrir l'IA à tous sans qu'ils aient besoin d'une clé, il faut un serveur qui garde **votre** clé secrète :

1. Déployer aussi l'application sur un hébergeur Node.js (par exemple Vercel, gratuit) avec les variables
   `GEMINI_API_KEY` (ou `ANTHROPIC_API_KEY`) et `AI_ALLOWED_ORIGINS=https://souleymane2022.github.io`.
2. Sur GitHub : **Settings → Secrets and variables → Actions → Variables → New repository variable**
   `AI_ENDPOINT` = `https://<votre-projet>.vercel.app/api/ai/`
3. Relancer le workflow : la version GitHub Pages utilisera cette API.

⚠️ Ne jamais mettre votre clé (Gemini ou Anthropic) dans GitHub Pages ni dans le code : elle serait visible de tous.

Pour tester la version statique en local :

```bash
GITHUB_PAGES=true BASE_PATH=/Langue_Marba npm run build   # (retirer d'abord src/app/api, comme le fait le workflow)
```

### Déploiement sur un serveur Node.js
N'importe quel hébergeur Node.js (Vercel, Render, Railway, VPS…). Définir la variable d'environnement
`ANTHROPIC_API_KEY` (et optionnellement `AI_RATE_LIMIT_PER_HOUR`, 60 par défaut). Une fois le site ouvert sur un
téléphone, « Ajouter à l'écran d'accueil » l'installe comme une application ; le contenu est alors disponible hors-ligne.

## Mettre à jour le dictionnaire

Le fichier source est `docs/source/Dictionnaire_Marba_Akaki.docx`. Après modification :

```bash
npm run data -- docs/source/Dictionnaire_Marba_Akaki.docx
```

Le script `scripts/parse_dictionary.py` régénère `src/data/*.json` (utilisé par l'IA côté serveur) et `public/data/*.json`
(chargé par l'application et mis en cache hors-ligne).

## Organisation du code

```
scripts/parse_dictionary.py   conversion du dictionnaire Word → JSON
src/data/, public/data/       dictionnaire et proverbes (JSON)
src/lib/
  normalize.ts, search.ts     recherche insensible aux accents et aux lettres spéciales
  sectors.ts, lessons.ts      secteurs de base et découpage en leçons
  srs.ts, quiz.ts             révision espacée (SM-2) et génération de quiz
  translate.ts                traduction mot à mot hors-ligne
  ai-modes.ts, ai-prompt.ts   fonctions de l'assistant, prompt et recherche de contexte
  gemini.ts, ai-client.ts     appel de Gemini (serveur ou navigateur) / choix clé personnelle ou serveur
  progress.ts, audio-store.ts progression (localStorage) et enregistrements (IndexedDB)
src/app/api/ai/route.ts       API de l'assistant (Gemini ou Claude, réponses en streaming)
src/app/…                     pages de l'application
public/sw.js                  service worker (mode hors-ligne)
tests/                        tests unitaires
```
