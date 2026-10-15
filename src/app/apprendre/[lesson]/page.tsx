"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useData } from "@/lib/data-client";
import { enroll, gradeCard, recordLesson } from "@/lib/progress";
import { buildQuiz, type Question } from "@/lib/quiz";
import { sectorEntries } from "@/lib/sectors";
import { shortGloss } from "@/lib/normalize";
import { QuizRunner } from "@/components/QuizRunner";
import { ExampleView, Loading, ProgressBar, Recorder, SpeakFr } from "@/components/ui";
import type { Entry } from "@/lib/types";

export default function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson: lessonId } = use(params);
  const { data, error } = useData();
  const [step, setStep] = useState<"decouvrir" | "quiz" | "fin">("decouvrir");
  const [card, setCard] = useState(0);

  const found = useMemo(() => {
    if (!data) return null;
    for (const c of data.courses) {
      const i = c.lessons.findIndex((l) => l.id === lessonId);
      if (i >= 0) return { course: c, lesson: c.lessons[i], next: c.lessons[i + 1] };
    }
    return null;
  }, [data, lessonId]);

  const words: Entry[] = useMemo(
    () => (found && data ? found.lesson.entryIds.map((id) => data.index.byId.get(id)!).filter(Boolean) : []),
    [found, data],
  );
  const [questions, setQuestions] = useState<Question[]>([]);

  if (!data) return <Loading error={error} />;
  if (!found)
    return (
      <div className="notice">
        Leçon introuvable. <Link href="/apprendre">Retour</Link>
      </div>
    );

  const { course, lesson, next } = found;
  const w = words[card];

  return (
    <div className="stack">
      <Link href="/apprendre" className="small">
        ← Parcours
      </Link>
      <h1>
        {course.sector.icon} {course.sector.name} · Leçon {lesson.index}
      </h1>

      {step === "decouvrir" && w && (
        <>
          <p className="muted">
            Étape 1 : découvrez les {words.length} mots, écoutez, répétez à voix haute. Étape 2 : quiz.
          </p>
          <ProgressBar value={card + 1} max={words.length} />
          <div className="card stack">
            <div className="row">
              <span className="word-big">{w.word}</span>
              <span className="spacer" />
              <span className="muted small">
                {card + 1}/{words.length}
              </span>
            </div>
            {w.forms.length > 0 && <span className="muted small">Formes : {w.forms.join(", ")}</span>}
            <div className="row">
              <p style={{ fontSize: "1.3rem", margin: 0 }}>{shortGloss(w.gloss, 120)}</p>
              <SpeakFr text={shortGloss(w.gloss, 120)} />
            </div>
            {w.examples.slice(0, 2).map((x, i) => (
              <ExampleView key={i} ex={x} />
            ))}
            {w.expressions.slice(0, 2).map((x, i) => (
              <ExampleView key={`x${i}`} ex={x} />
            ))}
            <Recorder storageKey={`entry:${w.id}`} />
          </div>
          <div className="row">
            <button className="btn" disabled={card === 0} onClick={() => setCard(card - 1)}>
              ← Précédent
            </button>
            <span className="spacer" />
            {card + 1 < words.length ? (
              <button className="btn btn-primary" onClick={() => setCard(card + 1)}>
                Suivant →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  enroll(words.map((x) => x.id));
                  setQuestions(buildQuiz(words, sectorEntries(data.dict.entries, course.sector)));
                  setStep("quiz");
                }}
              >
                Passer au quiz ⚡
              </button>
            )}
          </div>
        </>
      )}

      {step === "quiz" && (
        <QuizRunner
          questions={questions}
          onAnswer={(q, ok) => gradeCard(q.entryId, ok ? 4 : 0)}
          onFinish={(score, total) => {
            recordLesson(lesson.id, score, total);
            setStep("fin");
          }}
        />
      )}

      {step === "fin" && (
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setCard(0);
              setStep("decouvrir");
            }}
          >
            Recommencer la leçon
          </button>
          {next ? (
            <Link className="btn btn-primary" href={`/apprendre/${next.id}`}>
              Leçon suivante →
            </Link>
          ) : (
            <Link className="btn btn-primary" href="/apprendre">
              Retour aux parcours
            </Link>
          )}
          <Link className="btn" href="/apprendre/revision">
            Réviser
          </Link>
        </div>
      )}
    </div>
  );
}
