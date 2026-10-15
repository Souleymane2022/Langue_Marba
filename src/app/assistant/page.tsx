"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AI_MODES, AI_MODE_BY_ID, MAX_INPUT, type AiModeId } from "@/lib/ai-modes";
import { AI_AVAILABLE, streamAi } from "@/lib/ai-client";
import { SECTORS } from "@/lib/sectors";
import { addXp } from "@/lib/progress";
import { Markdown } from "@/components/Markdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const STARTERS: Partial<Record<AiModeId, string[]>> = {
  tuteur: ["Apprends-moi à saluer quelqu'un le matin", "Quels sont les pronoms personnels ?", "Comment compter de 1 à 10 ?", "Fais-moi un petit test de vocabulaire"],
  "traduire-fr": ["Mon enfant est malade, il a de la fièvre.", "Nous allons au champ demain matin.", "Combien coûte ce mil ?"],
  "traduire-mar": ["Ami i mi abagei ka memeera", "Aban nda sunda gaandula ɦei", "An i akoiɗa"],
  grammaire: ["Comment se forme la négation ?", "Comment poser une question ?", "Comment dire « mon » et « ton » ?"],
  proverbe: ["Wiyeŋa kal banaŋa", "Zla ɗa avoɗa saɗ tat nata liwɗa"],
};

function AssistantInner() {
  const params = useSearchParams();
  const initialMode = (AI_MODE_BY_ID.has(params.get("mode") as AiModeId) ? params.get("mode") : "tuteur") as AiModeId;
  const [mode, setMode] = useState<AiModeId>(initialMode);
  const [sector, setSector] = useState(params.get("secteur") ?? "sante");
  const [input, setInput] = useState(params.get("q") ?? "");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const m = AI_MODE_BY_ID.get(mode)!;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  function switchMode(id: AiModeId) {
    ctrl.current?.abort();
    setMode(id);
    setMsgs([]);
    setErr(null);
  }

  async function send(text = input) {
    const q = text.trim();
    if ((!q && !m.sector) || busy) return;
    ctrl.current = new AbortController();
    const history = m.chat ? msgs : [];
    const display = q || `(${SECTORS.find((s) => s.id === sector)?.name})`;
    setMsgs([...history, { role: "user", content: display }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setErr(null);
    try {
      await streamAi(
        { mode, input: q, sector: m.sector ? sector : undefined, history },
        (full) => setMsgs((cur) => [...cur.slice(0, -1), { role: "assistant", content: full }]),
        ctrl.current.signal,
      );
      addXp(2);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setErr((e as Error).message);
        setMsgs((cur) => cur.slice(0, -1));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>✨ Assistant IA</h1>
      <p className="muted small">
        L&apos;assistant s&apos;appuie sur le dictionnaire Marba (2 230 mots, 3 246 phrases, 339 proverbes) et indique toujours son niveau
        de confiance. Le Marba est une langue peu documentée : faites valider les phrases importantes par un locuteur natif.
      </p>

      {!AI_AVAILABLE && (
        <div className="notice">
          L&apos;assistant IA n&apos;est pas encore activé sur cette version en ligne. En attendant, utilisez le dictionnaire, les leçons
          et la traduction mot à mot (hors-ligne).
        </div>
      )}
      <div className="grid-sm mode-grid">
        {AI_MODES.map((x) => (
          <button
            key={x.id}
            className="tile"
            style={{ minHeight: 90, cursor: "pointer", textAlign: "left", borderColor: x.id === mode ? "var(--primary)" : undefined, borderWidth: x.id === mode ? 2 : 1 }}
            onClick={() => switchMode(x.id)}
            aria-pressed={x.id === mode}
          >
            <span className="icon" style={{ fontSize: "1.4rem" }}>
              {x.icon}
            </span>
            <strong style={{ fontSize: "0.95rem" }}>{x.label}</strong>
          </button>
        ))}
      </div>

      <div className="card stack">
        <div>
          <strong>
            {m.icon} {m.label}
          </strong>
          <p className="muted small" style={{ margin: 0 }}>
            {m.description}
          </p>
        </div>
        {m.sector && (
          <label className="field">
            Secteur
            <select className="select" value={sector} onChange={(e) => setSector(e.target.value)}>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {msgs.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            {msgs.map((x, i) => (
              <div key={i} className={`chat-msg ${x.role} ${busy && i === msgs.length - 1 ? "typing" : ""}`}>
                {x.role === "assistant" ? <Markdown text={x.content || "…"} /> : x.content}
              </div>
            ))}
            <div ref={bottom} />
          </div>
        )}
        {err && <div className="notice err">{err}</div>}

        {msgs.length === 0 && STARTERS[mode] && (
          <div className="row">
            {STARTERS[mode]!.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            className="textarea"
            value={input}
            maxLength={MAX_INPUT}
            onChange={(e) => setInput(e.target.value)}
            placeholder={m.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "L'IA écrit…" : m.chat && msgs.length ? "Envoyer" : "Lancer"}
            </button>
            {busy && (
              <button type="button" className="btn btn-ghost" onClick={() => ctrl.current?.abort()}>
                Arrêter
              </button>
            )}
            <span className="spacer" />
            {msgs.length > 0 && !busy && (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => navigator.clipboard?.writeText(msgs.filter((x) => x.role === "assistant").map((x) => x.content).join("\n\n"))}
                >
                  📋 Copier
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMsgs([])}>
                  Effacer
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantInner />
    </Suspense>
  );
}
