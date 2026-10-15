"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { streamAi, useAiAvailable } from "@/lib/ai-client";
import type { AiModeId } from "@/lib/ai-modes";
import { Markdown } from "./Markdown";
import { SpeakButton } from "./SpeakButton";

/** Bouton « demander à l'IA » réutilisable (explication d'un mot, d'un proverbe, dialogue de secteur…). */
export function AiBox({
  mode,
  input,
  sector,
  label,
}: {
  mode: AiModeId;
  input: string;
  sector?: string;
  label: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const available = useAiAvailable();

  async function run() {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setBusy(true);
    setErr(null);
    setText("");
    try {
      await streamAi({ mode, input, sector }, setText, ctrl.current.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row no-print">
        <button className="btn btn-primary" onClick={run} disabled={busy}>
          ✨ {busy ? "L'IA réfléchit…" : label}
        </button>
        {busy && (
          <button className="btn btn-ghost" onClick={() => ctrl.current?.abort()}>
            Arrêter
          </button>
        )}
      </div>
      {!available && (
        <p className="small muted no-print" style={{ margin: 0 }}>
          Pour utiliser l&apos;IA, ajoutez votre clé Gemini gratuite dans les <Link href="/assistant">réglages de l&apos;assistant</Link>.
        </p>
      )}
      {err && <div className="notice err">{err}</div>}
      {(text || busy) && (
        <div className={`card ${busy ? "typing" : ""}`}>
          <Markdown text={text || "…"} />
          {text && !busy && (
            <div className="no-print" style={{ marginTop: 8 }}>
              <SpeakButton text={text} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
