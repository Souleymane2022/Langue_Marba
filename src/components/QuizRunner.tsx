"use client";

import Link from "next/link";
import { useState } from "react";
import type { Question } from "@/lib/quiz";
import { ProgressBar } from "./ui";

const KIND_LABEL: Record<Question["kind"], string> = {
  mar2fr: "Que signifie ce mot Marba ?",
  fr2mar: "Comment dit-on en Marba ?",
  cloze: "Complétez la phrase authentique :",
};

export function QuizRunner({
  questions,
  onFinish,
  onAnswer,
}: {
  questions: Question[];
  onFinish: (score: number, total: number) => void;
  onAnswer?: (q: Question, correct: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [mistakes, setMistakes] = useState<Question[]>([]);

  if (!questions.length) return <p className="muted">Pas assez de mots pour un quiz ici.</p>;

  if (done) {
    const pct = Math.round((100 * score) / questions.length);
    return (
      <div className="card stack center">
        <div style={{ fontSize: "3rem" }}>{pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "💪"}</div>
        <h2>
          {score} / {questions.length} bonnes réponses
        </h2>
        <p className="muted">{pct >= 80 ? "Excellent travail !" : pct >= 50 ? "Bien ! Continuez à réviser." : "Courage, la répétition fait le maître."}</p>
        {mistakes.length > 0 && (
          <div style={{ textAlign: "left" }}>
            <h3>À revoir</h3>
            {mistakes.map((q) => (
              <p key={q.entryId + q.kind}>
                <Link href={`/dictionnaire/${q.entryId}`}>{q.prompt}</Link> → <b>{q.answer}</b>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  const q = questions[i];
  function choose(c: string) {
    if (picked) return;
    const ok = c === q.answer;
    setPicked(c);
    if (ok) setScore((s) => s + 1);
    else setMistakes((m) => [...m, q]);
    onAnswer?.(q, ok);
  }
  function next() {
    if (i + 1 >= questions.length) {
      setDone(true);
      onFinish(score, questions.length);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  return (
    <div className="stack">
      <div className="row small muted">
        <span>
          Question {i + 1} / {questions.length}
        </span>
        <span className="spacer" />
        <span>Score : {score}</span>
      </div>
      <ProgressBar value={i} max={questions.length} />
      <div className="card stack">
        <span className="muted small">{KIND_LABEL[q.kind]}</span>
        <div className={q.kind === "fr2mar" ? "" : "mar"} style={{ fontSize: q.kind === "cloze" ? "1.2rem" : "1.8rem", fontWeight: 800 }}>
          {q.prompt}
        </div>
        {q.context && <div className="muted">« {q.context} »</div>}
      </div>
      <div className="choices">
        {q.choices.map((c) => {
          const cls = picked ? (c === q.answer ? "correct" : c === picked ? "wrong" : "") : "";
          return (
            <button key={c} className={`choice ${cls} ${q.kind !== "mar2fr" ? "mar" : ""}`} onClick={() => choose(c)} disabled={!!picked}>
              {c}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="row">
          <span className={`notice ${picked === q.answer ? "ok" : "err"}`} style={{ flex: 1 }}>
            {picked === q.answer ? "✅ Bonne réponse !" : `❌ La bonne réponse était : ${q.answer}`}
          </span>
          <button className="btn btn-primary" onClick={next} autoFocus>
            {i + 1 >= questions.length ? "Voir le résultat" : "Suivant →"}
          </button>
        </div>
      )}
    </div>
  );
}
