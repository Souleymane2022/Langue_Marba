import { shortGloss } from "./normalize.ts";
import { search, searchExamples, type SearchIndex } from "./search.ts";
import { SECTOR_BY_ID, sectorEntries, sectorPhrases } from "./sectors.ts";
import { tokens, FR_STOPWORDS } from "./normalize.ts";
import type { AiModeId } from "./ai-modes.ts";
import type { Entry, Proverb } from "./types.ts";

/**
 * Construction des prompts de l'assistant.
 *
 * Le Marba est une langue peu dotée : le modèle n'en a qu'une connaissance
 * très limitée. L'assistant est donc « ancré » dans le dictionnaire :
 *   1. le lexique complet (mot → sens) est placé dans le prompt système, mis en cache ;
 *   2. pour chaque requête, on ajoute les fiches détaillées et les phrases
 *      authentiques les plus pertinentes (recherche dans le dictionnaire).
 */
export const INSTRUCTIONS = `Tu es l'assistant de « Vun Marbana », une application qui aide à apprendre et à utiliser la langue Marba, langue tchadique parlée au Tchad (Tandjilé, Mayo-Kebbi Est et Ouest, Logone Occidental, Chari-Baguirmi ; centre de référence : sous-préfecture de Baktchoro). Elle est apparentée au Musey et au Masana.

Tes utilisateurs : apprenants, enseignants et alphabétiseurs, agents de santé, agents agricoles, administrations, ONG, radios communautaires, membres de la diaspora.

RÈGLES ESSENTIELLES (honnêteté linguistique)
1. Ta seule source fiable sur le Marba est le DICTIONNAIRE fourni (lexique ci-dessous + fiches et phrases authentiques jointes à chaque demande). Tes connaissances propres sur le Marba sont très limitées : ne t'y fie pas.
2. N'invente jamais un mot Marba. Si un mot n'est pas dans le dictionnaire, dis-le clairement, propose une périphrase construite avec des mots attestés, ou garde le mot français/arabe tchadien d'usage courant entre guillemets, et invite à faire valider ou compléter par un locuteur natif (rubrique « Contribuer » de l'application).
3. Quand tu composes une phrase qui n'est pas attestée telle quelle, appuie-toi sur la structure des phrases d'exemple et signale-la avec ⚠️ « à faire valider par un locuteur natif ».
4. Pour toute traduction, indique un niveau de confiance :
   - 🟢 élevé : phrase ou expression attestée dans le dictionnaire ;
   - 🟡 moyen : phrase assemblée à partir de mots et de structures attestés ;
   - 🔴 faible : mots manquants ou structure incertaine.
5. Pour la santé, la justice ou tout message diffusé au public, rappelle qu'une validation par un locuteur natif est indispensable avant diffusion.
6. Respecte l'orthographe du dictionnaire : ɓ, ɗ (implosives), ŋ, ɦ, ə, ɨ, c (= tch), j (= dj), sl et zl (fricatives latérales), voyelles longues redoublées (aa, ee…), nasalisation notée par le tilde (ã, ĩ, õ), « á » = pour / afin que.

REPÈRES DE GRAMMAIRE OBSERVÉS DANS LES EXEMPLES (à vérifier et illustrer avec des phrases attestées)
- Pronoms sujets : an (je), aŋ (tu), mam (il/elle), ami (nous), agi (vous), azi (ils/elles). Ex. : « An i akoiɗa » = je pars en voyage ; « Ami i mi abagei » = nous allons en brousse.
- Ordre habituel : sujet – verbe – complément.
- Possessifs suffixés au nom : -nda (mon, ma : abunda = mon père, amanda = ma femme), -ŋ (ton, ta, tes : humaŋ = tes oreilles).
- Négation encadrante : nga … ɗi (« Toɗa nga ɦatɗ sa ɗi » = la bastonnade n'a jamais éduqué personne).
- Question fermée : particule finale zu (« … ko zu ? ») ; « ge » en fin de question pour où/quoi/comment (« Aŋ i ni lara ge ? » = où es-tu allé ?).
- « le … ni » : si / quand (« Le afaata nde avini ni » = si le soleil sort demain).

STYLE
- Réponds en français simple et chaleureux (beaucoup d'utilisateurs ont un niveau de lecture modeste) ; phrases courtes.
- Écris toujours le Marba en **gras**, suivi de la traduction française.
- Utilise un Markdown simple : titres ###, listes à puces, gras. Pas de tableaux larges.
- Termine par une ligne « 📖 Mots du dictionnaire utilisés : … » listant les mots Marba sur lesquels tu t'es appuyé.`;

export function buildLexicon(entries: Entry[]): string {
  const lines = entries
    .filter((e) => e.gloss)
    .map((e) => {
      const forms = e.forms.length ? ` [${e.forms.join(", ")}]` : "";
      const pos = e.pos.length ? ` (${e.pos.join(",")})` : "";
      return `${e.word}${forms}${pos} : ${shortGloss(e.gloss, 70)}`;
    });
  return `LEXIQUE MARBA → FRANÇAIS (${lines.length} entrées du dictionnaire ; forme de base, [variantes/pluriels], (catégorie))\n${lines.join("\n")}`;
}

function entryCard(e: Entry): string {
  const parts = [`■ ${e.word}${e.forms.length ? ` (${e.forms.join(", ")})` : ""} — ${e.posLabel || "?"} — ${e.gloss}`];
  if (e.definition.length) parts.push(`  Notes : ${e.definition.slice(0, 2).join(" ").slice(0, 300)}`);
  for (const x of e.expressions.slice(0, 4)) parts.push(`  * ${x.mar} = ${x.fr}`);
  for (const x of e.examples.slice(0, 3)) parts.push(`  « ${x.mar} » = ${x.fr}`);
  return parts.join("\n");
}

export interface PromptContext {
  index: SearchIndex;
  entries: Entry[];
  proverbs: Proverb[];
}

/** Sélectionne dans le dictionnaire ce qui est utile pour répondre à la demande. */
export function retrieveContext(ctx: PromptContext, query: string, sectorId?: string): string {
  const blocks: string[] = [];
  const picked = new Map<string, Entry>();
  for (const e of search(ctx.index, query, "auto", 12)) picked.set(e.id, e);
  // chaque mot significatif de la requête, séparément (les phrases longues diluent la recherche)
  for (const t of tokens(query).filter((t) => !FR_STOPWORDS.has(t) && t.length >= 2).slice(0, 25)) {
    for (const e of search(ctx.index, t, "auto", 3)) picked.set(e.id, e);
  }
  const sector = sectorId ? SECTOR_BY_ID.get(sectorId) : undefined;
  if (sector) for (const e of sectorEntries(ctx.entries, sector).slice(0, 25)) picked.set(e.id, e);

  if (picked.size) blocks.push(`FICHES DU DICTIONNAIRE LES PLUS PERTINENTES\n${[...picked.values()].slice(0, 60).map(entryCard).join("\n")}`);

  const examples = searchExamples(ctx.index, query, 15);
  if (sector) examples.push(...sectorPhrases(ctx.entries, sector, 15).map((p) => ({ ...p, word: "" })));
  if (examples.length) {
    const seen = new Set<string>();
    const lines = examples.filter((x) => !seen.has(x.mar) && seen.add(x.mar)).map((x) => `« ${x.mar} » = ${x.fr}`);
    blocks.push(`PHRASES AUTHENTIQUES DU DICTIONNAIRE (modèles de structure)\n${lines.join("\n")}`);
  }

  const qt = new Set(tokens(query).filter((t) => t.length >= 4 && !FR_STOPWORDS.has(t)));
  const provs = ctx.proverbs.filter((p) => tokens(`${p.mar} ${p.fr}`).some((t) => qt.has(t))).slice(0, 6);
  if (provs.length) blocks.push(`PROVERBES MARBA LIÉS\n${provs.map((p) => `${p.id}. « ${p.mar} » = ${p.fr}`).join("\n")}`);

  if (sector) blocks.push(`SECTEUR : ${sector.name} — ${sector.description}`);
  return blocks.join("\n\n");
}

const TASKS: Record<AiModeId, (input: string, sectorName?: string) => string> = {
  tuteur: (i) =>
    `Question ou message de l'apprenant :\n${i}\n\nRéponds comme un tuteur patient : explique, donne 1 à 3 exemples attestés, puis propose un mini-exercice ou une question pour pratiquer.`,
  "traduire-fr": (i) =>
    `Traduis en Marba le texte français suivant :\n"""${i}"""\n\nDonne : ### Traduction (avec niveau de confiance), ### Mot à mot (chaque mot Marba et son sens), ### Mots manquants (s'il y en a, avec une proposition de périphrase), ### Remarques.`,
  "traduire-mar": (i) =>
    `Traduis en français la phrase Marba suivante :\n"""${i}"""\n\nDonne : ### Traduction, ### Analyse mot à mot (forme, sens, rôle), ### Mots non reconnus (s'il y en a), ### Niveau de confiance.`,
  corriger: (i) =>
    `Un apprenant a écrit ceci (phrase Marba, éventuellement avec ce qu'il veut dire) :\n"""${i}"""\n\nVérifie l'orthographe (selon le dictionnaire), le choix des mots et la structure par comparaison avec les phrases attestées. Donne : ### Verdict, ### Version proposée, ### Explications, ### Pour progresser. Sois encourageant.`,
  dialogue: (i, s) =>
    `Crée un dialogue court (6 à 10 répliques) pour le secteur « ${s ?? "vie quotidienne"} », situation : ${i || "situation typique du secteur"}.\nPour chaque réplique : personnage, **Marba**, traduction française, niveau de confiance. Ensuite : ### Vocabulaire clé (mots attestés), ### Notes culturelles et de politesse, ### À faire valider.`,
  message: (i, s) =>
    `Prépare un message de sensibilisation (secteur « ${s ?? "général"} ») à diffuser à la radio communautaire, par un crieur ou sur une affiche. Contenu à transmettre : ${i}\nDonne : ### Message en français (3 à 5 phrases simples), ### Version Marba (phrase par phrase, niveau de confiance), ### Mots-clés Marba à retenir, ### Conseils de diffusion, ### ⚠️ Validation obligatoire par un locuteur natif avant diffusion.`,
  exercices: (i, s) =>
    `Crée une série de 8 exercices variés et corrigés en t'appuyant UNIQUEMENT sur des mots et phrases attestés. Thème : ${i || s || "vocabulaire de base"}${s ? ` (secteur ${s})` : ""}.\nTypes : QCM de vocabulaire, traduction Marba → français, phrase à trous (avec une phrase authentique), association. Termine par ### Corrigé.`,
  fiche: (i, s) =>
    `Rédige une fiche pédagogique pour un enseignant ou alphabétiseur. Sujet : ${i}${s ? ` (secteur ${s})` : ""}.\nStructure : ### Objectifs, ### Public et durée, ### Matériel, ### Vocabulaire (mots attestés, en Marba et en français), ### Déroulement (étapes minutées : mise en route, découverte, pratique orale, écrit, jeu), ### Évaluation, ### Prolongements (chant, conte, proverbe lié).`,
  proverbe: (i) =>
    `Explique ce proverbe :\n"""${i}"""\n\nDonne : ### Le proverbe (Marba et traduction du dictionnaire si disponible), ### Mot à mot, ### Sens et leçon, ### Quand l'utiliser, ### Proverbe français équivalent. Si le proverbe n'est pas dans le dictionnaire, dis-le.`,
  grammaire: (i) =>
    `Question de grammaire :\n${i}\n\nExplique simplement, en t'appuyant sur au moins 4 phrases authentiques du dictionnaire (cite-les). Distingue clairement ce qui est observé dans les exemples et ce qui reste une hypothèse. Termine par un petit exercice.`,
};

export function buildUserMessage(mode: AiModeId, input: string, context: string, sectorName?: string): string {
  return `${context ? `${context}\n\n` : ""}DEMANDE\n${TASKS[mode](input, sectorName)}`;
}
