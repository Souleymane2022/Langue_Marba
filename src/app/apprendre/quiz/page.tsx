"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-client";
import { buildQuiz, shuffle } from "@/lib/quiz";
import { isQuizFriendly } from "@/lib/normalize";
import { SECTORS, sectorEntries } from "@/lib/sectors";
import { gradeCard, recordQuiz } from "@/lib/progress";
import { QuizRunner } from "@/components/QuizRunner";
import { Loading } from "@/components/ui";

export default function QuickQuiz() {
  const { data, error } = useData();
  const [sector, setSector] = useState("");
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);

  const questions = useMemo(() => {
    if (!data || !started) return [];
    const s = SECTORS.find((x) => x.id === sector);
    const pool = (s ? sectorEntries(data.dict.entries, s) : data.dict.entries).filter((e) => isQuizFriendly(e.gloss, e.word));
    return buildQuiz(shuffle(pool).slice(0, 10), pool.length > 20 ? pool : data.dict.entries);
  }, [data, sector, round, started]);

  if (!data) return <Loading error={error} />;

  return (
    <div className="stack">
      <Link href="/apprendre" className="small">
        ← Apprendre
      </Link>
      <h1>Quiz rapide</h1>
      {!started ? (
        <div className="card stack">
          <label className="field">
            Thème
            <select className="select" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">Tout le vocabulaire</option>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => setStarted(true)}>
            Commencer ⚡
          </button>
        </div>
      ) : (
        <>
          <QuizRunner
            key={round}
            questions={questions}
            onAnswer={(q, ok) => !ok && gradeCard(q.entryId, 0)}
            onFinish={(score, total) => recordQuiz(`quiz:${sector || "general"}`, score, total)}
          />
          <div className="row">
            <button className="btn" onClick={() => setRound((r) => r + 1)}>
              🔄 Nouveau quiz
            </button>
            <button className="btn btn-ghost" onClick={() => setStarted(false)}>
              Changer de thème
            </button>
          </div>
        </>
      )}
    </div>
  );
}
