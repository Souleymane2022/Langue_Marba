"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/lib/data-client";
import { useProgress } from "@/lib/progress";
import { isDue, isMastered } from "@/lib/srs";
import { Loading, ProgressBar } from "@/components/ui";

export default function LearnPage() {
  const { data, error } = useData();
  const p = useProgress();
  const [open, setOpen] = useState<string | null>("vie-quotidienne");
  const cards = Object.values(p.srs);
  const due = cards.filter((c) => isDue(c)).length;
  const mastered = cards.filter(isMastered).length;

  return (
    <div className="stack">
      <h1>Apprendre le Marba</h1>
      <div className="grid">
        <Link href="/apprendre/revision" className="tile">
          <span className="icon">🔁</span>
          <strong>Révision du jour</strong>
          <p>{due ? `${due} mot(s) à revoir maintenant` : cards.length ? "Rien à revoir pour l'instant 🎉" : "Terminez une leçon pour commencer"}</p>
        </Link>
        <Link href="/apprendre/quiz" className="tile">
          <span className="icon">⚡</span>
          <strong>Quiz rapide</strong>
          <p>10 questions sur tout le vocabulaire ou un secteur.</p>
        </Link>
        <Link href="/alphabet" className="tile">
          <span className="icon">🔤</span>
          <strong>Alphabet & prononciation</strong>
          <p>Bien lire et écrire les sons du Marba.</p>
        </Link>
        <Link href="/assistant?mode=tuteur" className="tile">
          <span className="icon">🧑‍🏫</span>
          <strong>Tuteur IA</strong>
          <p>Conversation guidée et explications personnalisées.</p>
        </Link>
      </div>

      <div className="card">
        <div className="row">
          <strong>Mots maîtrisés</strong>
          <span className="spacer" />
          <span className="muted small">
            {mastered} / {cards.length}
          </span>
        </div>
        <ProgressBar value={mastered} max={Math.max(cards.length, 1)} />
      </div>

      <h2 className="section">Parcours thématiques</h2>
      {!data && <Loading error={error} />}
      {data?.courses
        .filter((c) => c.lessons.length)
        .map((c) => {
          const done = c.lessons.filter((l) => p.lessons[l.id]).length;
          const isOpen = open === c.sector.id;
          return (
            <div key={c.sector.id} className="card">
              <button
                className="row"
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                onClick={() => setOpen(isOpen ? null : c.sector.id)}
                aria-expanded={isOpen}
              >
                <span style={{ fontSize: "1.6rem" }}>{c.sector.icon}</span>
                <span style={{ flex: 1 }}>
                  <strong>{c.sector.name}</strong>
                  <br />
                  <span className="muted small">
                    {done} / {c.lessons.length} leçons
                  </span>
                </span>
                <span>{isOpen ? "▲" : "▼"}</span>
              </button>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={done} max={c.lessons.length} />
              </div>
              {isOpen && (
                <div className="grid-sm" style={{ marginTop: 12 }}>
                  {c.lessons.map((l) => {
                    const r = p.lessons[l.id];
                    return (
                      <Link key={l.id} href={`/apprendre/${l.id}`} className="tile" style={{ minHeight: 80 }}>
                        <strong>
                          {r ? (r.best === r.total ? "🏆" : "✅") : "📘"} Leçon {l.index}
                        </strong>
                        <p>
                          {l.entryIds
                            .slice(0, 3)
                            .map((id) => data.index.byId.get(id)?.word)
                            .join(", ")}
                          …
                        </p>
                        {r && (
                          <p>
                            Meilleur score : {r.best}/{r.total}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
