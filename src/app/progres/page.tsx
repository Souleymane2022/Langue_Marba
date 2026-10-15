"use client";

import { useRef, useState } from "react";
import { exportProgress, importProgress, setProfile, streak, useProgress } from "@/lib/progress";
import { isDue, isMastered } from "@/lib/srs";

const BADGES: { id: string; icon: string; label: string; test: (p: ReturnType<typeof useProgress>) => boolean }[] = [
  { id: "first", icon: "🌱", label: "Premiers pas (1 leçon)", test: (p) => Object.keys(p.lessons).length >= 1 },
  { id: "ten", icon: "📗", label: "Assidu (10 leçons)", test: (p) => Object.keys(p.lessons).length >= 10 },
  { id: "words50", icon: "🧠", label: "50 mots en apprentissage", test: (p) => Object.keys(p.srs).length >= 50 },
  { id: "master20", icon: "🎓", label: "20 mots maîtrisés", test: (p) => Object.values(p.srs).filter(isMastered).length >= 20 },
  { id: "streak7", icon: "🔥", label: "7 jours d'affilée", test: (p) => streak(p.days) >= 7 },
  { id: "xp500", icon: "⭐", label: "500 points", test: (p) => p.xp >= 500 },
  { id: "contrib", icon: "🤝", label: "Contributeur", test: (p) => p.contributions.length >= 1 },
  { id: "contrib10", icon: "🏅", label: "Gardien de la langue (10 contributions)", test: (p) => p.contributions.length >= 10 },
];

export default function ProgressPage() {
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const cards = Object.values(p.srs);
  const quizTotal = p.quizzes.reduce((a, q) => a + q.total, 0);
  const quizScore = p.quizzes.reduce((a, q) => a + q.score, 0);

  function download() {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `progression-marba-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="stack">
      <h1>📈 Mes progrès</h1>
      <div className="grid-sm">
        <div className="stat">
          <b>⭐ {p.xp}</b>
          <span>points</span>
        </div>
        <div className="stat">
          <b>🔥 {streak(p.days)}</b>
          <span>jours d&apos;affilée</span>
        </div>
        <div className="stat">
          <b>📅 {p.days.length}</b>
          <span>jours d&apos;étude</span>
        </div>
        <div className="stat">
          <b>🧠 {cards.length}</b>
          <span>mots appris</span>
        </div>
        <div className="stat">
          <b>🎓 {cards.filter(isMastered).length}</b>
          <span>mots maîtrisés</span>
        </div>
        <div className="stat">
          <b>🔁 {cards.filter((c) => isDue(c)).length}</b>
          <span>à réviser</span>
        </div>
        <div className="stat">
          <b>✅ {quizTotal ? Math.round((100 * quizScore) / quizTotal) : 0} %</b>
          <span>réussite aux quiz</span>
        </div>
        <div className="stat">
          <b>🤝 {p.contributions.length}</b>
          <span>contributions</span>
        </div>
      </div>

      <section className="card">
        <h2>Badges</h2>
        <div className="grid-sm">
          {BADGES.map((b) => {
            const ok = b.test(p);
            return (
              <div key={b.id} className="stat" style={{ opacity: ok ? 1 : 0.4 }}>
                <b>{b.icon}</b>
                <span>{b.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <h2>Mon profil</h2>
        <label className="field">
          Prénom
          <input className="input" value={p.profile.name} onChange={(e) => setProfile({ ...p.profile, name: e.target.value })} />
        </label>
        <label className="field">
          Mon objectif
          <select className="select" value={p.profile.goal} onChange={(e) => setProfile({ ...p.profile, goal: e.target.value as typeof p.profile.goal })}>
            <option value="decouvrir">Découvrir la langue et la culture</option>
            <option value="parler">Parler au quotidien</option>
            <option value="enseigner">Enseigner / alphabétiser</option>
            <option value="professionnel">Usage professionnel (santé, agriculture, administration…)</option>
          </select>
        </label>
        <label className="field">
          Objectif quotidien (mots à réviser)
          <input
            className="input"
            type="number"
            min={5}
            max={100}
            value={p.profile.dailyTarget}
            onChange={(e) => setProfile({ ...p.profile, dailyTarget: Number(e.target.value) || 10 })}
          />
        </label>
      </section>

      <section className="card stack">
        <h2>Sauvegarde</h2>
        <p className="muted small">
          Votre progression est enregistrée sur cet appareil. Exportez-la pour la garder ou la transférer sur un autre téléphone.
        </p>
        <div className="row">
          <button className="btn" onClick={download}>
            ⬇️ Exporter
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            ⬆️ Importer
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importProgress(await f.text());
                setMsg("Progression importée ✔");
              } catch (err) {
                setMsg((err as Error).message);
              }
            }}
          />
        </div>
        {msg && <div className="notice">{msg}</div>}
      </section>

      {p.quizzes.length > 0 && (
        <section className="card">
          <h2>Derniers quiz</h2>
          {p.quizzes
            .slice(-10)
            .reverse()
            .map((q, i) => (
              <div key={i} className="row small" style={{ borderBottom: "1px solid var(--border)", padding: "6px 0" }}>
                <span>{new Date(q.at).toLocaleDateString("fr-FR")}</span>
                <span className="muted">{q.label}</span>
                <span className="spacer" />
                <b>
                  {q.score}/{q.total}
                </b>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
