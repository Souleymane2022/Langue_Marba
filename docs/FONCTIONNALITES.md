# Vun Marbana — liste des fonctionnalités

Application pour **apprendre et utiliser la langue Marba** (Tchad) dans les secteurs de base, propulsée par l'IA.
Source linguistique : *Dictionnaire Marba* (Akaki) — 2 230 entrées, 3 246 phrases d'exemple, 339 proverbes.

Légende : ✅ disponible dans cette version · 🔜 prévu (feuille de route)

---

## 1. Dictionnaire Marba ⇄ Français
- ✅ 2 230 mots avec formes (pluriels, variantes), catégorie grammaticale, sens, notes, expressions et phrases d'exemple
- ✅ Recherche dans les deux sens, **sans clavier spécial** (taper `dub` trouve `duɓ`, `ng` trouve `ŋ`)
- ✅ Recherche par famille de mots (« malade » trouve « maladie »)
- ✅ Parcours par lettre de l'alphabet Marba (A, B, Ɓ, … MB, NG, NJ, SL, ZL)
- ✅ Filtres : noms, verbes, adverbes, idéophones, animaux, plantes, corps, médecine, nombres
- ✅ Clavier des lettres spéciales (ɓ ɗ ŋ ɦ ə ɨ ã ĩ õ ’)
- ✅ Favoris
- ✅ Lecture à voix haute du sens en français (aide aux personnes peu alphabétisées)
- ✅ Enregistrement de la prononciation par un locuteur natif (stocké sur l'appareil)
- ✅ Mots proches, secteurs d'usage de chaque mot
- ✅ Explication d'un mot par l'IA
- 🔜 Audio de référence enregistré par des locuteurs validés, pour chaque mot

## 2. Apprentissage
- ✅ 16 parcours thématiques découpés en leçons de 8 mots (des plus simples aux plus rares)
- ✅ Leçon en 2 étapes : découverte (mot, sens, exemples, prononciation) puis quiz
- ✅ Quiz variés : Marba → français, français → Marba, **phrase authentique à compléter**
- ✅ Quiz rapide (tout le vocabulaire ou par secteur)
- ✅ **Révision espacée** (algorithme SM-2) : chaque mot revient juste avant l'oubli
- ✅ Cartes mémoire recto/verso dans les deux sens
- ✅ Alphabet et guide de prononciation (implosives ɓ ɗ, latérales sl zl, voyelles longues, nasalisation, coup de glotte)
- ✅ Tuteur IA conversationnel
- 🔜 Exercices d'écoute et de prononciation (comparaison à l'audio de référence)
- 🔜 Niveaux (débutant → avancé) et test de positionnement

## 3. Secteurs de base
16 secteurs, chacun avec vocabulaire, phrases authentiques, leçons et outils IA :

| Secteur | Exemples d'usage |
|---|---|
| 👋 Vie quotidienne & salutations | saluer, se présenter, prendre congé |
| 🩺 Santé | consultation, symptômes, vaccination, paludisme, VIH, grossesse |
| 🧍 Corps humain | dire où l'on a mal |
| 📚 Éducation & alphabétisation | école, nombres, contes, réunion parents-maître |
| 🌾 Agriculture | semis, récolte, semences, criquets |
| 🐄 Élevage | bétail malade, vente, vaccination de la volaille |
| 🎣 Pêche & chasse | fleuve, filets, pièges |
| 🛒 Commerce & marché | marchander, dettes, boutique |
| 🍲 Alimentation & cuisine | boule, sauce, hygiène de l'eau |
| 👨‍👩‍👧 Famille & société | parenté, mariage, naissance, accueil |
| ⚖️ Administration, justice & paix | chefferie, conflits de champs, état civil, témoignage |
| 🥁 Culture, religion & traditions | fêtes, danses, condoléances |
| 🌦️ Environnement & climat | saisons, feux de brousse, puits |
| 🦜 Animaux & plantes | faune, flore, plantes médicinales |
| 🛖 Habitat, artisanat & métiers | case, forge, vannerie, tissage |
| 🧭 Déplacements & orientation | demander son chemin, voyager |

- ✅ Lexique imprimable par secteur (pour affichage au centre de santé, à l'école, à la mairie…)
- ✅ Dialogues générés par l'IA pour des situations réelles
- ✅ **Messages de sensibilisation** (radio communautaire, crieur, affiche) avec avertissement de validation
- ✅ Fiches pédagogiques pour enseignants et alphabétiseurs
- ✅ Générateur d'exercices corrigés
- 🔜 Glossaires techniques validés (termes médicaux, juridiques, agricoles nouveaux)

## 4. Assistant IA (Gemini gratuit ou Claude)
10 fonctions, toutes **ancrées dans le dictionnaire** :

| Fonction | Rôle |
|---|---|
| 🧑‍🏫 Tuteur personnel | conversation, explications, mini-exercices |
| ➡️ Français → Marba | traduction avec niveau de confiance 🟢🟡🔴 et mot à mot |
| ⬅️ Marba → Français | traduction et analyse grammaticale |
| ✅ Correcteur | vérifie une phrase de l'apprenant |
| 💬 Dialogues par secteur | situations réalistes avec vocabulaire et notes culturelles |
| 📢 Message de sensibilisation | santé, agriculture, civisme |
| 📝 Générateur d'exercices | QCM, traduction, phrases à trous, corrigé |
| 🏫 Fiche pédagogique | plan de cours minuté |
| 🪶 Expliquer un proverbe | sens littéral, leçon, usage, équivalent français |
| 🔤 Grammaire | explications illustrées par des phrases attestées |

Fournisseurs :
- ✅ **Gemini (Google) avec une clé gratuite** saisie par l'utilisateur : fonctionne directement depuis le téléphone, même sur GitHub Pages
- ✅ Gemini ou Claude (Anthropic) côté serveur, avec la clé du propriétaire du site

Voix :
- ✅ **L'assistant parle** : voix neuronale naturelle de Gemini (8 voix posées au choix), lecture fluide des longues réponses
- ✅ **On lui parle** : dictée au micro (🎙️), en français
- ✅ **Mode vocal** : question dictée envoyée automatiquement, réponse lue automatiquement
- ✅ Vitesse de lecture réglable (lente pour l'apprentissage)
- ✅ Voix du téléphone en secours (sans clé, ou quota vocal gratuit épuisé)
- 🔜 Prononciation exacte du Marba : nécessite des enregistrements de locuteurs natifs (corpus en cours de collecte via « Contribuer »)

Garde-fous :
- ✅ Le lexique complet (2 230 mots) est fourni au modèle à chaque requête (mis en cache), plus les fiches et phrases authentiques les plus pertinentes
- ✅ Interdiction d'inventer des mots ; les phrases non attestées sont signalées ⚠️
- ✅ Niveau de confiance systématique et liste des mots du dictionnaire utilisés
- ✅ Rappel de validation par un locuteur natif pour la santé, la justice et toute diffusion publique
- ✅ Limitation du nombre de requêtes par adresse IP, taille des messages bornée
- 🔜 Reconnaissance vocale (parler en Marba) et synthèse vocale Marba, entraînées sur le corpus audio collecté

## 5. Traduction
- ✅ **Mot à mot hors-ligne** (sans Internet), dans les deux sens, uniquement à partir de mots attestés
- ✅ Traduction complète par l'IA
- ✅ Proposition d'un mot manquant en un clic

## 6. Culture
- ✅ 339 proverbes (*Zlaɗa ɗogolã ki vun Marbana*) avec recherche
- ✅ Proverbe du jour, mot du jour
- ✅ Explication des proverbes par l'IA
- ✅ Enregistrement audio des proverbes
- 🔜 Contes, chants et devinettes

## 7. Communauté et enrichissement de la langue
- ✅ Proposer un nouveau mot, une correction, une phrase, un proverbe/conte (avec village d'usage)
- ✅ Export des contributions **avec les enregistrements audio** (fichier à envoyer au comité de langue)
- 🔜 Serveur de contributions avec circuit de validation (locuteurs → linguistes → publication)
- 🔜 Nouvelles versions du dictionnaire publiées automatiquement dans l'application

## 8. Progression et motivation
- ✅ Points d'expérience, série de jours, badges
- ✅ Mots appris / maîtrisés / à réviser, taux de réussite aux quiz, historique
- ✅ Profil (objectif : découvrir, parler, enseigner, usage professionnel ; objectif quotidien)
- ✅ Export / import de la progression (changement de téléphone)
- 🔜 Comptes et synchronisation ; classes pour les enseignants (suivi des élèves)

## 9. Accessibilité et contexte local
- ✅ Application web installable (PWA) sur téléphone Android/iPhone, sans passer par un store
- ✅ Publication automatique et gratuite sur GitHub Pages (souleymane2022.github.io/Langue_Marba)
- ✅ **Fonctionne hors-ligne** : dictionnaire, leçons, quiz, proverbes, traduction mot à mot
- ✅ Données légères (≈ 0,8 Mo pour tout le dictionnaire)
- ✅ Interface en français simple, gros boutons, icônes, mode sombre, lecture vocale
- ✅ Impression des lexiques
- 🔜 Interface en arabe tchadien
- 🔜 Version SMS / USSD et robot WhatsApp pour les téléphones simples
- 🔜 Émissions radio générées à partir des leçons

---

## Comment les données sont produites

`scripts/parse_dictionary.py` lit le fichier Word du dictionnaire (`docs/source/Dictionnaire_Marba_Akaki.docx`) :
paragraphe en **gras** = mot vedette, en *italique* = sens, `*expression : sens`, `phrase marba : traduction`.
Toute correction du dictionnaire se fait dans le fichier Word, puis :

```bash
npm run data -- docs/source/Dictionnaire_Marba_Akaki.docx
```
