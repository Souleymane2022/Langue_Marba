import { fold, tokens, FR_STOPWORDS, shortGloss } from "./normalize.ts";
import { search, type SearchIndex } from "./search.ts";
import type { Entry } from "./types.ts";

/**
 * Traduction « mot à mot » hors-ligne, fondée uniquement sur le dictionnaire.
 * Elle ne remplace pas une vraie traduction (l'ordre des mots et la grammaire
 * diffèrent), mais fonctionne sans Internet et ne présente que des mots attestés.
 */
export interface WordGloss {
  source: string;
  matches: { id: string; word: string; gloss: string }[];
}

export function marbaToFrench(index: SearchIndex, text: string): WordGloss[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const f = fold(raw);
      let found: Entry[] = index.byForm.get(f) ?? [];
      // formes possessives / suffixées : on essaie de retirer des suffixes fréquents
      if (!found.length) {
        for (const suf of ["nda", "nga", "ŋa", "na", "da", "ga", "ma", "a", "u", "i"]) {
          const sf = fold(suf);
          if (f.length > sf.length + 2 && f.endsWith(sf)) {
            found = index.byForm.get(f.slice(0, -sf.length)) ?? [];
            if (found.length) break;
          }
        }
      }
      return {
        source: raw,
        matches: found.slice(0, 3).map((e) => ({ id: e.id, word: e.word, gloss: shortGloss(e.gloss, 50) })),
      };
    });
}

export function frenchToMarba(index: SearchIndex, text: string): WordGloss[] {
  return tokens(text)
    .filter((t) => !FR_STOPWORDS.has(t))
    .map((t) => ({
      source: t,
      matches: search(index, t, "fr", 3).map((e) => ({ id: e.id, word: e.word, gloss: shortGloss(e.gloss, 50) })),
    }));
}
