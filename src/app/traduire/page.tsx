"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-client";
import { frenchToMarba, marbaToFrench } from "@/lib/translate";
import { AiBox } from "@/components/AiBox";
import { Loading } from "@/components/ui";

export default function TranslatePage() {
  const { data, error } = useData();
  const [dir, setDir] = useState<"fr" | "mar">("fr");
  const [text, setText] = useState("");

  const words = useMemo(() => {
    if (!data || !text.trim()) return [];
    return dir === "fr" ? frenchToMarba(data.index, text) : marbaToFrench(data.index, text);
  }, [data, dir, text]);

  return (
    <div className="stack">
      <h1>Traduction</h1>
      <div className="row">
        <button className={`chip ${dir === "fr" ? "active" : ""}`} onClick={() => setDir("fr")}>
          Français → Marba
        </button>
        <button className={`chip ${dir === "mar" ? "active" : ""}`} onClick={() => setDir("mar")}>
          Marba → Français
        </button>
      </div>
      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={dir === "fr" ? "Écrivez en français… (ex. : la femme prépare la boule de mil)" : "Écrivez en Marba… (ex. : Suma ci abara heĩ)"}
      />

      {!data && <Loading error={error} />}
      {words.length > 0 && (
        <section className="card">
          <h2>📴 Mot à mot (hors-ligne)</h2>
          <p className="muted small">
            Correspondances trouvées dans le dictionnaire, mot par mot. L&apos;ordre des mots et la grammaire du Marba diffèrent du
            français : utilisez l&apos;IA ci-dessous pour une phrase complète.
          </p>
          <div className="stack" style={{ gap: 6 }}>
            {words.map((w, i) => (
              <div key={i} className="row" style={{ alignItems: "baseline", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                <b style={{ minWidth: 110 }}>{w.source}</b>
                <span>→</span>
                {w.matches.length ? (
                  w.matches.map((m) => (
                    <Link key={m.id} href={`/dictionnaire/${m.id}`} className="chip">
                      {dir === "fr" ? (
                        <>
                          <span className="mar">{m.word}</span>&nbsp;({m.gloss})
                        </>
                      ) : (
                        m.gloss
                      )}
                    </Link>
                  ))
                ) : (
                  <span className="muted small">
                    introuvable — <Link href={`/contribuer?mot=${encodeURIComponent(w.source)}`}>proposer</Link>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {text.trim() && (
        <section className="card">
          <h2>✨ Traduction complète par l&apos;IA</h2>
          <AiBox key={dir + text} mode={dir === "fr" ? "traduire-fr" : "traduire-mar"} input={text} label="Traduire avec l'IA" />
        </section>
      )}
    </div>
  );
}
