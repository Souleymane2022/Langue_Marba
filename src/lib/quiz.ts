import { fold, shortGloss, isQuizFriendly } from "./normalize.ts";
import type { Entry } from "./types.ts";

export type QuestionKind = "fr2mar" | "mar2fr" | "cloze";

export interface Question {
  kind: QuestionKind;
  entryId: string;
  prompt: string;
  /** phrase de contexte (exemple authentique) */
  context?: string;
  choices: string[];
  answer: string;
}

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(target: Entry, pool: Entry[], key: (e: Entry) => string, n: number, rand: () => number) {
  const answer = key(target);
  const seen = new Set([fold(answer)]);
  const out: string[] = [];
  for (const e of shuffle(pool, rand)) {
    const k = key(e);
    const f = fold(k);
    if (!k || seen.has(f)) continue;
    seen.add(f);
    out.push(k);
    if (out.length >= n) break;
  }
  return out;
}

/** Trouve, dans un exemple, le mot qui correspond à l'entrée (forme de base ou variante). */
export function findClozeExample(entry: Entry): { sentence: string; token: string; fr: string } | null {
  const forms = [entry.word, ...entry.forms].map(fold).filter((f) => f.length >= 2);
  for (const ex of entry.examples) {
    const words = ex.mar.split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[.,;:!?«»"“”()]/g, "");
      if (forms.includes(fold(clean))) {
        return { sentence: ex.mar.replace(clean, "_____"), token: clean, fr: ex.fr };
      }
    }
  }
  return null;
}

export function buildQuestion(target: Entry, pool: Entry[], kind: QuestionKind, rand: () => number = Math.random): Question | null {
  const gloss = (e: Entry) => shortGloss(e.gloss, 50);
  if (kind === "cloze") {
    const c = findClozeExample(target);
    if (!c) return null;
    const answer = c.token.toLowerCase();
    const distract = pickDistractors(target, pool, (e) => e.word.toLowerCase(), 3, rand);
    const choices = shuffle([answer, ...distract], rand);
    return { kind, entryId: target.id, prompt: c.sentence, context: c.fr, choices, answer };
  }
  if (kind === "fr2mar") {
    const choices = shuffle([target.word, ...pickDistractors(target, pool, (e) => e.word, 3, rand)], rand);
    return { kind, entryId: target.id, prompt: gloss(target), choices, answer: target.word };
  }
  const choices = shuffle([gloss(target), ...pickDistractors(target, pool, gloss, 3, rand)], rand);
  return { kind, entryId: target.id, prompt: target.word, choices, answer: gloss(target) };
}

/** Construit une série de questions variées pour une liste de mots. */
export function buildQuiz(targets: Entry[], allPool: Entry[], seed = Date.now()): Question[] {
  const rand = rng(seed);
  const pool = allPool.filter((e) => isQuizFriendly(e.gloss, e.word));
  const kinds: QuestionKind[] = ["mar2fr", "fr2mar", "cloze"];
  const out: Question[] = [];
  targets.forEach((t, i) => {
    const preferred = kinds[i % kinds.length];
    const q = buildQuestion(t, pool, preferred, rand) ?? buildQuestion(t, pool, i % 2 ? "fr2mar" : "mar2fr", rand);
    if (q && q.choices.length >= 2) out.push(q);
  });
  return shuffle(out, rand);
}
