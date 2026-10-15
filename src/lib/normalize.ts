/**
 * Normalisation pour la recherche : insensible à la casse, aux accents et aux
 * lettres propres au Marba (ɓ, ɗ, ŋ, ɦ, ə, ɨ), afin qu'un utilisateur sans
 * clavier spécial puisse taper « dub » pour trouver « duɓ ».
 */
const SPECIAL: Record<string, string> = {
  ɓ: "b",
  ɗ: "d",
  ŋ: "ng",
  ɦ: "h",
  ə: "e",
  ɨ: "i",
  ɛ: "e",
  ɔ: "o",
  ƴ: "y",
  "’": "",
  "'": "",
  "ʼ": "",
  œ: "oe",
  æ: "ae",
};

export function fold(input: string): string {
  let s = input.toLowerCase();
  s = s.replace(/[ɓɗŋɦəɨɛɔƴ’'ʼœæ]/g, (c) => SPECIAL[c] ?? c);
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return s.replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokens(input: string): string[] {
  return fold(input)
    .split(/[\s-]+/)
    .filter(Boolean);
}

/** Mots-outils français ignorés lors de la recherche de sens. */
export const FR_STOPWORDS = new Set(
  (
    "le la les l un une des du de d au aux a et ou en dans sur sous pour par avec sans ce cet cette ces " +
    "je tu il elle on nous vous ils elles me te se mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs " +
    "qui que quoi dont est sont etre avoir ai as a avons avez ont ne pas plus tres bien y lui eux c s n qu " +
    "comment dire traduire traduis veut signifie mot phrase marba francais"
  ).split(" "),
);

/** Première partie utile d'une glose : retire le nom scientifique éventuel. */
export function shortGloss(gloss: string, max = 60): string {
  let g = gloss.trim();
  // « Gyps bengalensis, Gmelin : vautour » -> « vautour »
  if (g.includes(" : ")) {
    const [before, ...rest] = g.split(" : ");
    const after = rest.join(" : ").trim();
    if (after && !/\.\s/.test(before)) g = after;
  }
  g = g.split(/(?<=[a-zéèêàù)])\.\s/)[0];
  if (g.length > max) {
    const cut = g.slice(0, max);
    g = cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)) + "…";
  }
  return g.replace(/[.;,\s]+$/, "");
}

/** Deux mots français « de la même famille » (malade / maladie, cultiver / culture). */
export function sameFamily(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  return a.slice(0, 5) === b.slice(0, 5) && Math.abs(a.length - b.length) <= 3;
}

/** Glose exploitable dans un quiz (exclut les noms scientifiques et les gloses trop longues). */
export function isQuizFriendly(gloss: string, word: string): boolean {
  const g = shortGloss(gloss, 200);
  return !!g && g.length <= 40 && !/\b[A-Z][a-z]+ [a-z]+ (?:L\.|\(|[A-Z])/.test(g) && !/\s/.test(word.trim());
}
