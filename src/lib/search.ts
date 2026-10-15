import { fold, tokens, FR_STOPWORDS, sameFamily } from "./normalize.ts";
import type { Entry, Example } from "./types.ts";

export type Direction = "auto" | "mar" | "fr";

interface Indexed {
  entry: Entry;
  word: string;
  forms: string[];
  gloss: string;
  glossTokens: Set<string>;
  extra: string;
  exFr: string;
  exMar: string;
}

export interface SearchIndex {
  items: Indexed[];
  byId: Map<string, Entry>;
  /** forme marba repliée -> entrées (pour la traduction mot à mot) */
  byForm: Map<string, Entry[]>;
}

export function buildIndex(entries: Entry[]): SearchIndex {
  const byForm = new Map<string, Entry[]>();
  const items = entries.map((entry) => {
    const word = fold(entry.word);
    const forms = entry.forms.map(fold);
    for (const f of [word, ...forms]) {
      if (!f) continue;
      const list = byForm.get(f) ?? [];
      list.push(entry);
      byForm.set(f, list);
    }
    const gloss = fold(entry.gloss);
    return {
      entry,
      word,
      forms,
      gloss,
      glossTokens: new Set(gloss.split(" ")),
      extra: fold([...entry.definition, ...entry.expressions.map((e) => `${e.mar} ${e.fr}`)].join(" ")),
      exFr: fold(entry.examples.map((e) => e.fr).join(" ")),
      exMar: fold(entry.examples.map((e) => e.mar).join(" ")),
    };
  });
  return { items, byId: new Map(entries.map((e) => [e.id, e])), byForm };
}

function scoreItem(it: Indexed, q: string, qTokens: string[], dir: Direction): number {
  let s = 0;
  if (dir !== "fr") {
    if (it.word === q) s = Math.max(s, 100);
    else if (it.forms.includes(q)) s = Math.max(s, 90);
    else if (q.length >= 2 && it.word.startsWith(q)) s = Math.max(s, 60 - Math.min(it.word.length - q.length, 20));
    else if (q.length >= 3 && it.forms.some((f) => f.startsWith(q))) s = Math.max(s, 45);
    if (q.length >= 3 && s === 0 && it.exMar.split(" ").includes(q)) s = Math.max(s, 12);
  }
  if (dir !== "mar") {
    if (it.gloss === q) s = Math.max(s, 95);
    const meaningful = qTokens.filter((t) => !FR_STOPWORDS.has(t));
    if (meaningful.length) {
      const hits = meaningful.filter((t) => it.glossTokens.has(t)).length;
      const near = hits ? 0 : meaningful.filter((t) => [...it.glossTokens].some((g) => sameFamily(t, g))).length;
      if (hits) s = Math.max(s, 50 + (30 * hits) / meaningful.length - Math.min(it.gloss.length / 20, 10));
      else if (near) s = Math.max(s, 40 + (20 * near) / meaningful.length - Math.min(it.gloss.length / 20, 10));
      else if (meaningful.some((t) => t.length >= 4 && it.gloss.includes(t))) s = Math.max(s, 35);
      else if (meaningful.some((t) => t.length >= 4 && it.extra.includes(t))) s = Math.max(s, 18);
      else if (meaningful.some((t) => t.length >= 4 && it.exFr.includes(t))) s = Math.max(s, 8);
    }
  }
  return s;
}

export function search(index: SearchIndex, query: string, dir: Direction = "auto", limit = 50): Entry[] {
  const q = fold(query);
  if (!q) return [];
  const qTokens = tokens(query);
  const scored: { e: Entry; s: number }[] = [];
  for (const it of index.items) {
    const s = scoreItem(it, q, qTokens, dir);
    if (s > 0) scored.push({ e: it.entry, s });
  }
  scored.sort((a, b) => b.s - a.s || a.e.word.localeCompare(b.e.word));
  return scored.slice(0, limit).map((x) => x.e);
}

export interface FoundExample extends Example {
  entryId: string;
  word: string;
}

/** Exemples authentiques dont la traduction ou le texte marba contient les mots cherchés. */
export function searchExamples(index: SearchIndex, query: string, limit = 20): FoundExample[] {
  const qt = tokens(query).filter((t) => !FR_STOPWORDS.has(t) && t.length >= 3);
  if (!qt.length) return [];
  const out: { ex: FoundExample; s: number }[] = [];
  for (const it of index.items) {
    for (const ex of [...it.entry.examples, ...it.entry.expressions]) {
      const hay = new Set(tokens(`${ex.fr} ${ex.mar}`));
      const hits = qt.filter((t) => hay.has(t)).length;
      if (hits) out.push({ ex: { ...ex, entryId: it.entry.id, word: it.entry.word }, s: hits });
    }
  }
  out.sort((a, b) => b.s - a.s || a.ex.mar.length - b.ex.mar.length);
  return out.slice(0, limit).map((x) => x.ex);
}
