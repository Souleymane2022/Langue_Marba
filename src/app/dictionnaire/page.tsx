"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useData } from "@/lib/data-client";
import { search, type Direction } from "@/lib/search";
import { useProgress } from "@/lib/progress";
import { EntryRow, Loading } from "@/components/ui";

const LETTERS = ["A", "B", "Ɓ", "C", "D", "Ɗ", "E", "F", "G", "H", "Ɦ", "I", "J", "K", "L", "M", "MB", "N", "ND", "NG", "NJ", "O", "P", "R", "S", "SL", "T", "U", "V", "W", "Y", "Z", "ZL"];
const SPECIAL = ["ɓ", "ɗ", "ŋ", "ɦ", "ə", "ɨ", "ã", "ĩ", "õ", "’"];
const POS_FILTERS: [string, string][] = [
  ["", "Tout"],
  ["n", "Noms"],
  ["v", "Verbes"],
  ["adv", "Adverbes"],
  ["id", "Idéophones"],
  ["n.zoo", "Animaux"],
  ["n.bot", "Plantes"],
  ["n.anat", "Corps"],
  ["n.med", "Médecine"],
  ["num", "Nombres"],
];
const PAGE = 100;

function DictionaryInner() {
  const { data, error } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const p = useProgress();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [dir, setDir] = useState<Direction>("auto");
  const [letter, setLetter] = useState(params.get("l") ?? "A");
  const [pos, setPos] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => {
    if (!data) return [];
    let list = q.trim() ? search(data.index, q, dir, 300) : data.dict.entries.filter((e) => e.letter === letter);
    if (pos) list = list.filter((e) => e.pos.includes(pos));
    if (favOnly) list = (q.trim() || pos ? list : data.dict.entries).filter((e) => p.favorites.includes(e.id));
    return list;
  }, [data, q, dir, letter, pos, favOnly, p.favorites]);

  function setQuery(v: string) {
    setQ(v);
    setLimit(PAGE);
    const sp = new URLSearchParams();
    if (v) sp.set("q", v);
    router.replace(`/dictionnaire${v ? `?${sp}` : ""}`, { scroll: false });
  }

  return (
    <div className="stack">
      <h1>Dictionnaire Marba ⇄ Français</h1>
      {data && (
        <p className="muted small">
          {data.dict.meta.entryCount} entrées · {data.dict.meta.exampleCount} phrases d&apos;exemple · recherche sans accents (tapez « dub » pour « duɓ »)
        </p>
      )}
      <div className="card stack">
        <input
          className="input"
          type="search"
          placeholder="Chercher un mot en Marba ou en français…"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Rechercher"
        />
        <div className="row small">
          <span className="muted">Lettres :</span>
          {SPECIAL.map((c) => (
            <button key={c} className="chip" onClick={() => setQuery(q + c)} aria-label={`insérer ${c}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="row small">
          {(
            [
              ["auto", "Les deux sens"],
              ["mar", "Marba → Français"],
              ["fr", "Français → Marba"],
            ] as [Direction, string][]
          ).map(([d, l]) => (
            <button key={d} className={`chip ${dir === d ? "active" : ""}`} onClick={() => setDir(d)}>
              {l}
            </button>
          ))}
          <button className={`chip ${favOnly ? "active" : ""}`} onClick={() => setFavOnly(!favOnly)}>
            ★ Favoris ({p.favorites.length})
          </button>
        </div>
        <div className="row small">
          {POS_FILTERS.map(([code, label]) => (
            <button key={code} className={`chip ${pos === code ? "active" : ""}`} onClick={() => setPos(code)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!q.trim() && !favOnly && (
        <div className="letters" aria-label="Parcourir par lettre">
          {LETTERS.map((l) => (
            <button key={l} className={`chip ${letter === l ? "active" : ""}`} onClick={() => (setLetter(l), setLimit(PAGE))}>
              {l}
            </button>
          ))}
        </div>
      )}

      {!data ? (
        <Loading error={error} />
      ) : (
        <div className="card" style={{ padding: "4px 12px" }}>
          {results.length === 0 && (
            <p className="muted" style={{ padding: 12 }}>
              Aucun résultat. Essayez un autre mot, ou demandez à l&apos;<a href={`/assistant?mode=traduire-fr&q=${encodeURIComponent(q)}`}>assistant IA</a>. Ce mot
              manque ? <a href="/contribuer">Proposez-le</a>.
            </p>
          )}
          {results.slice(0, limit).map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
          {results.length > limit && (
            <div className="center" style={{ padding: 12 }}>
              <button className="btn" onClick={() => setLimit(limit + PAGE)}>
                Afficher plus ({results.length - limit} restants)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense>
      <DictionaryInner />
    </Suspense>
  );
}
