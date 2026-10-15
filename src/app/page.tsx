"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dayIndex, useData } from "@/lib/data-client";
import { isQuizFriendly, shortGloss } from "@/lib/normalize";
import { streak, useProgress } from "@/lib/progress";
import { isDue } from "@/lib/srs";
import { SECTORS } from "@/lib/sectors";
import { ExampleView, FavButton, Loading } from "@/components/ui";

const MODULES = [
  { href: "/dictionnaire", icon: "📖", title: "Dictionnaire", text: "Plus de 2 200 mots Marba–Français, avec exemples authentiques." },
  { href: "/apprendre", icon: "🎯", title: "Leçons & quiz", text: "Parcours progressifs, cartes mémoire et révision intelligente." },
  { href: "/secteurs", icon: "🏥", title: "Secteurs de base", text: "Santé, éducation, agriculture, commerce, administration…" },
  { href: "/assistant", icon: "✨", title: "Assistant IA", text: "Tuteur, traducteur, correcteur, dialogues et fiches pédagogiques." },
  { href: "/traduire", icon: "🔁", title: "Traduction", text: "Mot à mot hors-ligne, ou traduction complète par l'IA." },
  { href: "/proverbes", icon: "🪶", title: "Proverbes", text: "339 proverbes Marba expliqués : sagesse et culture." },
  { href: "/alphabet", icon: "🔤", title: "Alphabet & sons", text: "Lettres spéciales (ɓ, ɗ, ŋ, ɦ, sl, zl…) et prononciation." },
  { href: "/contribuer", icon: "🤝", title: "Contribuer", text: "Ajoutez des mots, corrections et enregistrements audio." },
];

export default function Home() {
  const { data, error } = useData();
  const p = useProgress();
  const due = Object.values(p.srs).filter((c) => isDue(c)).length;

  const word = useMemo(() => {
    if (!data) return null;
    const good = data.dict.entries.filter((e) => e.examples.length && isQuizFriendly(e.gloss, e.word));
    return good[dayIndex(good.length)];
  }, [data]);
  const proverb = data ? data.proverbs[dayIndex(data.proverbs.length, 7)] : null;

  return (
    <div className="stack">
      <section className="card" style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)" }}>
        <h1>
          Bienvenue — <span className="mar">Vun Marbana</span>
        </h1>
        <p>
          Apprenez, parlez et utilisez la langue Marba du Tchad au quotidien : à l&apos;école, au centre de santé, au champ, au marché
          et dans l&apos;administration. Le dictionnaire fonctionne même sans Internet ; l&apos;assistant IA vous aide à aller plus loin.
        </p>
        <div className="row">
          <Link href="/apprendre" className="btn btn-primary">
            Commencer une leçon
          </Link>
          {due > 0 && (
            <Link href="/apprendre/revision" className="btn">
              🔁 Réviser ({due} mots)
            </Link>
          )}
          <Link href="/assistant" className="btn">
            ✨ Demander à l&apos;IA
          </Link>
        </div>
      </section>

      <div className="grid-sm">
        <div className="stat">
          <b>🔥 {streak(p.days)}</b>
          <span>jours d&apos;affilée</span>
        </div>
        <div className="stat">
          <b>⭐ {p.xp}</b>
          <span>points d&apos;expérience</span>
        </div>
        <div className="stat">
          <b>🧠 {Object.keys(p.srs).length}</b>
          <span>mots en apprentissage</span>
        </div>
        <div className="stat">
          <b>📚 {Object.keys(p.lessons).length}</b>
          <span>leçons terminées</span>
        </div>
      </div>

      {!data && <Loading error={error} />}

      {word && (
        <section className="card">
          <div className="row">
            <span className="badge">Mot du jour</span>
            <span className="spacer" />
            <FavButton id={word.id} />
          </div>
          <Link href={`/dictionnaire/${word.id}`} className="word-big">
            {word.word}
          </Link>
          <p style={{ fontSize: "1.15rem" }}>{shortGloss(word.gloss, 120)}</p>
          {word.examples[0] && <ExampleView ex={word.examples[0]} />}
        </section>
      )}

      {proverb && (
        <section className="card">
          <span className="badge">Proverbe du jour</span>
          <p className="mar" style={{ fontSize: "1.15rem", marginTop: 8 }}>
            {proverb.mar}
          </p>
          <p className="muted">{proverb.fr}</p>
          <Link href={`/proverbes?p=${proverb.id}`}>Comprendre ce proverbe →</Link>
        </section>
      )}

      <section className="section">
        <h2>Tout ce que vous pouvez faire</h2>
        <div className="grid">
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="tile">
              <span className="icon">{m.icon}</span>
              <strong>{m.title}</strong>
              <p>{m.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Le Marba dans les secteurs de base</h2>
        <div className="row">
          {SECTORS.map((s) => (
            <Link key={s.id} href={`/secteurs/${s.id}`} className="chip">
              {s.icon} {s.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
