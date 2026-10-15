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

Le Marba est une langue peu documentée : aucun modèle d'IA ne la connaît vraiment. L'assistant (Claude, d'Anthropic)
est donc **ancré dans le dictionnaire** : il reçoit à chaque requête le lexique complet et les phrases authentiques les plus
pertinentes, a pour consigne de ne jamais inventer de mot, affiche un **niveau de confiance** (🟢 attesté, 🟡 assemblé,
🔴 incertain) et rappelle de faire valider par un locuteur natif tout texte destiné au public (santé, justice, radio).

## Démarrer

Prérequis : Node.js 20+ (et Python 3 uniquement pour régénérer les données).

```bash
npm install
cp .env.example .env.local      # puis renseigner ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

Sans clé API, tout fonctionne sauf l'assistant IA (dictionnaire, leçons, quiz, traduction mot à mot, proverbes).

```bash
npm test          # tests unitaires (recherche, révision espacée, quiz, secteurs, contexte IA)
npm run typecheck
npm run build && npm start
```

### Déploiement
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
  progress.ts, audio-store.ts progression (localStorage) et enregistrements (IndexedDB)
src/app/api/ai/route.ts       API de l'assistant (Claude, réponses en streaming)
src/app/…                     pages de l'application
public/sw.js                  service worker (mode hors-ligne)
tests/                        tests unitaires
```
