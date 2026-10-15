"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-client";
import { gradeCard, useProgress } from "@/lib/progress";
import { isDue, type Grade } from "@/lib/srs";
import { shortGloss } from "@/lib/normalize";
import { ExampleView, Loading, ProgressBar } from "@/components/ui";

/** Révision espacée : cartes mémoire (recto Marba / verso français, ou l'inverse). */
export default function ReviewPage() {
  const { data, error } = useData();
  const p = useProgress();
  const [reverse, setReverse] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  // la file est figée au début de la séance (les mots ratés reviennent à la séance suivante)
  const [queue, setQueue] = useState<string[] | null>(null);
  const dueNow = useMemo(
    () =>
      Object.entries(p.srs)
        .filter(([, c]) => isDue(c))
        .sort((a, b) => a[1].due - b[1].due)
        .map(([id]) => id)
        .slice(0, 30),
    [p.srs],
  );

  if (!data) return <Loading error={error} />;
  const id = queue?.[doneCount];
  const entry = id ? data.index.byId.get(id) : undefined;

  function grade(g: Grade) {
    if (!id) return;
    gradeCard(id, g);
    setFlipped(false);
    setDoneCount((n) => n + 1);
  }

  return (
    <div className="stack">
      <Link href="/apprendre" className="small">
        ← Apprendre
      </Link>
      <h1>Révision espacée</h1>
      <p className="muted small">
        Chaque mot revient au bon moment : juste avant que vous ne l&apos;oubliiez. Soyez honnête avec vous-même !
      </p>
      <div className="row">
        <button className={`chip ${!reverse ? "active" : ""}`} onClick={() => setReverse(false)}>
          Marba → Français
        </button>
        <button className={`chip ${reverse ? "active" : ""}`} onClick={() => setReverse(true)}>
          Français → Marba
        </button>
      </div>

      {!queue && dueNow.length > 0 ? (
        <div className="card center stack">
          <h2>{dueNow.length} mot(s) à réviser</h2>
          <button className="btn btn-primary" onClick={() => setQueue(dueNow)}>
            Commencer la révision
          </button>
        </div>
      ) : !entry ? (
        <div className="card center stack">
          <div style={{ fontSize: "3rem" }}>🎉</div>
          <h2>{doneCount ? `Séance terminée : ${doneCount} mot(s) révisé(s) !` : "Aucun mot à réviser pour le moment."}</h2>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" href="/apprendre">
              Apprendre de nouveaux mots
            </Link>
            <Link className="btn" href="/apprendre/quiz">
              Quiz rapide
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ProgressBar value={doneCount} max={queue?.length ?? 0} />
          <div className="card flashcard" onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} onKeyDown={(e) => e.key === " " && setFlipped(!flipped)}>
            {!reverse || flipped ? <div className="word-big">{entry.word}</div> : null}
            {reverse || flipped ? <div style={{ fontSize: "1.4rem" }}>{shortGloss(entry.gloss, 100)}</div> : null}
            {!flipped && <span className="muted small">Touchez la carte pour voir la réponse</span>}
            {flipped && entry.examples[0] && (
              <div style={{ textAlign: "left", width: "100%" }}>
                <ExampleView ex={entry.examples[0]} />
              </div>
            )}
          </div>
          {flipped ? (
            <div className="grid-sm">
              <button className="btn" style={{ borderColor: "var(--danger)" }} onClick={() => grade(0)}>
                😕 À revoir
              </button>
              <button className="btn" onClick={() => grade(3)}>
                🤔 Difficile
              </button>
              <button className="btn" onClick={() => grade(4)}>
                🙂 Bien
              </button>
              <button className="btn" style={{ borderColor: "var(--ok)" }} onClick={() => grade(5)}>
                😄 Facile
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setFlipped(true)}>
              Voir la réponse
            </button>
          )}
        </>
      )}
    </div>
  );
}
