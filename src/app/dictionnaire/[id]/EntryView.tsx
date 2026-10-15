"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/lib/data-client";
import { enroll, useProgress } from "@/lib/progress";
import { SECTORS, entryInSector } from "@/lib/sectors";
import { search } from "@/lib/search";
import { shortGloss } from "@/lib/normalize";
import { AiBox } from "@/components/AiBox";
import { ExampleView, FavButton, Loading, Recorder, SpeakFr } from "@/components/ui";

export default function EntryView({ id }: { id: string }) {
  const { data, error } = useData();
  const p = useProgress();
  const entry = data?.index.byId.get(decodeURIComponent(id));

  const related = useMemo(() => {
    if (!data || !entry) return [];
    const first = shortGloss(entry.gloss, 40).split(/[,;]/)[0];
    return search(data.index, first, "fr", 8).filter((e) => e.id !== entry.id);
  }, [data, entry]);

  if (!data) return <Loading error={error} />;
  if (!entry)
    return (
      <div className="notice">
        Mot introuvable. <Link href="/dictionnaire">Retour au dictionnaire</Link>
      </div>
    );

  const sectors = SECTORS.filter((s) => entryInSector(entry, s));
  const learning = !!p.srs[entry.id];

  return (
    <div className="stack">
      <Link href="/dictionnaire" className="small">
        ← Dictionnaire
      </Link>
      <article className="card stack">
        <div className="row">
          <span className="word-big">{entry.word}</span>
          <span className="spacer" />
          <FavButton id={entry.id} />
        </div>
        {entry.forms.length > 0 && (
          <p className="muted">
            Autres formes : <span className="mar">{entry.forms.join(", ")}</span>
          </p>
        )}
        <div className="row">
          {entry.posLabel && <span className="badge">{entry.posLabel}</span>}
          {sectors.map((s) => (
            <Link key={s.id} href={`/secteurs/${s.id}`} className="chip">
              {s.icon} {s.name}
            </Link>
          ))}
        </div>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <p style={{ fontSize: "1.25rem", margin: 0, flex: 1 }}>{entry.gloss}</p>
          <SpeakFr text={entry.gloss} />
        </div>
        {entry.definition.map((d, i) => (
          <p key={i} className="muted">
            {d}
          </p>
        ))}
        <Recorder storageKey={`entry:${entry.id}`} />
        <div className="row">
          <button className="btn btn-sm" onClick={() => enroll([entry.id])} disabled={learning}>
            {learning ? "✓ Dans mes révisions" : "＋ Ajouter à mes révisions"}
          </button>
          <Link className="btn btn-sm" href={`/contribuer?mot=${encodeURIComponent(entry.word)}&id=${entry.id}`}>
            ✏️ Proposer une correction
          </Link>
        </div>
      </article>

      {entry.expressions.length > 0 && (
        <section className="card">
          <h2>Expressions et mots composés</h2>
          {entry.expressions.map((x, i) => (
            <ExampleView key={i} ex={x} />
          ))}
        </section>
      )}

      {entry.examples.length > 0 && (
        <section className="card">
          <h2>Exemples</h2>
          {entry.examples.map((x, i) => (
            <ExampleView key={i} ex={x} />
          ))}
        </section>
      )}

      <section className="card">
        <h2>Aller plus loin avec l&apos;IA</h2>
        <AiBox
          mode="tuteur"
          input={`Explique-moi le mot Marba « ${entry.word} » (${entry.gloss}) : prononciation d'après l'orthographe, formes, emploi dans des phrases attestées, mots de la même famille, et propose-moi un petit exercice.`}
          label="Expliquer ce mot"
        />
      </section>

      {related.length > 0 && (
        <section className="card">
          <h2>Mots proches</h2>
          <div className="row">
            {related.map((r) => (
              <Link key={r.id} className="chip" href={`/dictionnaire/${r.id}`}>
                <b>{r.word}</b>&nbsp;· {shortGloss(r.gloss, 30)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
