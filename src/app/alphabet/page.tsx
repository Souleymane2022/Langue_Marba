"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/lib/data-client";
import { shortGloss } from "@/lib/normalize";
import { Loading } from "@/components/ui";
import type { Entry } from "@/lib/types";

/** Ordre alphabétique et conventions de transcription du dictionnaire. */
const LETTERS: { l: string; hint: string; start?: string }[] = [
  { l: "a", hint: "a comme dans « papa »" },
  { l: "b", hint: "b ordinaire" },
  { l: "ɓ", hint: "b implosif : on aspire légèrement l'air en fermant les lèvres", start: "Ɓ" },
  { l: "c", hint: "se prononce « tch » (comme dans « Tchad »)" },
  { l: "d", hint: "d ordinaire" },
  { l: "ɗ", hint: "d implosif : la langue claque en aspirant l'air", start: "Ɗ" },
  { l: "e", hint: "é / è" },
  { l: "ə", hint: "e muet, comme dans « le »" },
  { l: "f", hint: "f ordinaire" },
  { l: "g", hint: "toujours dur, comme dans « gare »" },
  { l: "h", hint: "h soufflé" },
  { l: "ɦ", hint: "h sonore (voisé), plus doux que h", start: "Ɦ" },
  { l: "i", hint: "i comme dans « ici »" },
  { l: "ɨ", hint: "i central, entre « i » et « ou »" },
  { l: "j", hint: "se prononce « dj » (comme dans « Djamena »)" },
  { l: "k", hint: "k ordinaire" },
  { l: "l", hint: "l ordinaire" },
  { l: "m", hint: "m ordinaire" },
  { l: "mb", hint: "m et b prononcés d'un seul coup (prénasalisée)", start: "MB" },
  { l: "n", hint: "n ordinaire" },
  { l: "ng", hint: "n et g prononcés ensemble en début de mot", start: "NG" },
  { l: "nj", hint: "n et dj prononcés ensemble", start: "NJ" },
  { l: "ŋ", hint: "« ng » de l'anglais « sing », en milieu et fin de mot" },
  { l: "o", hint: "o comme dans « mot »" },
  { l: "p", hint: "p ordinaire" },
  { l: "r", hint: "r roulé" },
  { l: "s", hint: "toujours « ss »" },
  { l: "sl", hint: "fricative latérale sourde /ɬ/ : souffler sur les côtés de la langue en position de « l »", start: "SL" },
  { l: "t", hint: "t ordinaire" },
  { l: "u", hint: "« ou » comme dans « fou »" },
  { l: "v", hint: "v ordinaire" },
  { l: "w", hint: "« ou » bref, comme dans « oui »" },
  { l: "y", hint: "comme dans « yeux »" },
  { l: "z", hint: "z ordinaire" },
  { l: "zl", hint: "fricative latérale sonore /ɮ/ : comme sl, mais en faisant vibrer la voix", start: "ZL" },
  { l: "’", hint: "coup de glotte : brève coupure de la voix (aba’ã)" },
];

export default function AlphabetPage() {
  const { data, error } = useData();

  const examples = useMemo(() => {
    const map = new Map<string, Entry>();
    if (!data) return map;
    for (const { l, start } of LETTERS) {
      const key = (start ?? l).toLowerCase();
      const found = data.dict.entries.find(
        (e) =>
          e.word.toLowerCase().startsWith(key) &&
          (key.length > 1 || !LETTERS.some((x) => x.l.length > 1 && x.l.startsWith(key) && e.word.toLowerCase().startsWith(x.l))) &&
          e.gloss.length < 40 &&
          e.examples.length,
      );
      if (found) map.set(l, found);
    }
    return map;
  }, [data]);

  return (
    <div className="stack">
      <h1>🔤 Alphabet et prononciation</h1>
      <div className="card">
        <p>
          Le dictionnaire utilise l&apos;Alphabet Phonétique International, avec quelques adaptations : <b>c</b> = « tch », <b>j</b> = « dj »,{" "}
          <b>sl</b> et <b>zl</b> pour les fricatives latérales.
        </p>
        <ul>
          <li>
            <b>Voyelles longues</b> : la voyelle est doublée (<span className="mar">aa, ee, ii, oo, uu</span>) — <span className="mar">zlam</span> /{" "}
            <span className="mar">zlaam</span> n&apos;ont pas le même sens.
          </li>
          <li>
            <b>Nasalisation</b> : un tilde sur la voyelle (<span className="mar">ã, ĩ, õ</span>), le son passe par le nez.
          </li>
          <li>
            <b>á</b> (avec accent) = « pour, afin que ».
          </li>
          <li>
            <b>ŋ</b> s&apos;écrit en milieu et fin de mot ; en début de mot on écrit <b>ng</b>.
          </li>
        </ul>
        <p className="muted small">
          Astuce : dans la recherche, vous pouvez taper les lettres simples (b, d, ng, h) à la place de ɓ, ɗ, ŋ, ɦ.
        </p>
      </div>
      {!data && <Loading error={error} />}
      <div className="grid">
        {LETTERS.map(({ l, hint }) => {
          const ex = examples.get(l);
          return (
            <div key={l} className="card">
              <div className="row">
                <span className="word-big" style={{ minWidth: 60 }}>
                  {l}
                </span>
                <span className="small">{hint}</span>
              </div>
              {ex && (
                <p className="small" style={{ marginTop: 8, marginBottom: 0 }}>
                  Ex. : <Link href={`/dictionnaire/${ex.id}`} className="mar">{ex.word}</Link> — {shortGloss(ex.gloss, 40)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
