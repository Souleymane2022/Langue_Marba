import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fold, shortGloss, isQuizFriendly } from "../src/lib/normalize.ts";
import { buildIndex, search, searchExamples } from "../src/lib/search.ts";
import { newCard, review, isDue, isMastered } from "../src/lib/srs.ts";
import { buildQuiz, findClozeExample } from "../src/lib/quiz.ts";
import { SECTORS, SECTOR_BY_ID, entryInSector, sectorEntries } from "../src/lib/sectors.ts";
import { buildCourses, LESSON_SIZE } from "../src/lib/lessons.ts";
import { marbaToFrench, frenchToMarba } from "../src/lib/translate.ts";
import { buildLexicon, retrieveContext } from "../src/lib/ai-prompt.ts";
import type { Dictionary, Proverb } from "../src/lib/types.ts";

const dict = JSON.parse(readFileSync(new URL("../public/data/dictionary.json", import.meta.url), "utf8")) as Dictionary;
const proverbs = JSON.parse(readFileSync(new URL("../public/data/proverbs.json", import.meta.url), "utf8")) as Proverb[];
const index = buildIndex(dict.entries);
const byWord = (w: string) => dict.entries.find((e) => e.word === w)!;

test("données : dictionnaire et proverbes extraits", () => {
  assert.ok(dict.entries.length > 2000);
  assert.ok(dict.meta.exampleCount > 3000);
  assert.equal(new Set(dict.entries.map((e) => e.id)).size, dict.entries.length, "identifiants uniques");
  assert.ok(proverbs.length >= 330);
  assert.ok(proverbs.every((p) => p.mar && p.fr), "chaque proverbe a sa traduction");
  const aba = byWord("Abagei");
  assert.equal(aba.gloss, "Brousse");
  assert.deepEqual(aba.forms, ["abageya", "abageiɗa"]);
});

test("normalisation : lettres spéciales et accents", () => {
  assert.equal(fold("Tuguɗei"), "tugudei");
  assert.equal(fold("Ɓaŋ ɦã"), "bang ha");
  assert.equal(fold("Aba’ã"), "abaa");
  assert.equal(shortGloss("Gyps bengalensis, Gmelin : vautour"), "vautour");
  assert.equal(shortGloss("Criquet, sauterelle (terme générique). On distingue : x"), "Criquet, sauterelle (terme générique)");
  assert.ok(!isQuizFriendly("Tephrosia bracteolata Guil. Et Perr", "Abibleŋe"));
  assert.ok(isQuizFriendly("Brousse", "Abagei"));
});

test("recherche : Marba sans caractères spéciaux et français", () => {
  assert.equal(search(index, "tugudei")[0].word, "Tuguɗei");
  assert.equal(search(index, "eau", "fr")[0].word, "Mbi");
  assert.equal(search(index, "malade", "fr")[0].word, "Tuguɗei", "famille de mots malade/maladie");
  assert.ok(search(index, "femme", "fr").some((e) => e.word === "Aca"));
  assert.ok(searchExamples(index, "poisson filet").length > 0);
});

test("répétition espacée : intervalles croissants et oubli", () => {
  const t0 = Date.UTC(2026, 0, 1);
  let c = newCard(t0);
  assert.ok(isDue(c, t0));
  c = review(c, 4, t0);
  assert.equal(c.interval, 1);
  c = review(c, 4, t0);
  assert.equal(c.interval, 3);
  c = review(c, 4, t0);
  assert.ok(c.interval >= 7);
  assert.ok(isMastered(c));
  const lapsed = review(c, 0, t0);
  assert.equal(lapsed.reps, 0);
  assert.equal(lapsed.lapses, 1);
  assert.ok(lapsed.ef >= 1.3);
});

test("quiz : la bonne réponse figure parmi les choix", () => {
  const targets = sectorEntries(dict.entries, SECTOR_BY_ID.get("sante")!).slice(0, 8);
  const qs = buildQuiz(targets, dict.entries, 42);
  assert.ok(qs.length >= 6);
  for (const q of qs) {
    assert.ok(q.choices.includes(q.answer), `${q.kind} ${q.prompt}`);
    assert.equal(new Set(q.choices).size, q.choices.length, "pas de doublon");
  }
  const cloze = findClozeExample(byWord("Gugutu"));
  assert.ok(cloze && cloze.sentence.includes("_____"));
});

test("secteurs et leçons", () => {
  assert.ok(SECTORS.length >= 12);
  assert.ok(entryInSector(byWord("Tuguɗei"), SECTOR_BY_ID.get("sante")!));
  assert.ok(entryInSector(byWord("Asine"), SECTOR_BY_ID.get("agriculture")!));
  assert.ok(!entryInSector(byWord("Zuzu"), SECTOR_BY_ID.get("sante")!), "« mortier » n'est pas un terme de santé");
  for (const s of SECTORS) assert.ok(sectorEntries(dict.entries, s).length >= 20, s.id);
  const courses = buildCourses(dict.entries);
  for (const c of courses) {
    assert.ok(c.lessons.length > 0, c.sector.id);
    assert.ok(c.lessons.every((l) => l.entryIds.length <= LESSON_SIZE && l.entryIds.length >= 4));
  }
});

test("traduction mot à mot hors-ligne", () => {
  const mar = marbaToFrench(index, "Suma ci abara heĩ");
  assert.equal(mar.length, 4);
  assert.ok(mar.every((w) => w.matches.length > 0));
  const fr = frenchToMarba(index, "la femme prépare la boule");
  assert.deepEqual(
    fr.map((w) => w.source),
    ["femme", "prepare", "boule"],
  );
});

test("IA : lexique complet et contexte pertinent", () => {
  const lex = buildLexicon(dict.entries);
  assert.ok(lex.split("\n").length > 2000);
  const ctx = retrieveContext({ index, entries: dict.entries, proverbs }, "La femme prépare la boule de mil", "alimentation");
  assert.match(ctx, /■ Aca/);
  assert.match(ctx, /PHRASES AUTHENTIQUES/);
  assert.match(ctx, /SECTEUR : Alimentation/);
});
