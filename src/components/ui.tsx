"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { shortGloss } from "@/lib/normalize";
import { toggleFavorite, useProgress } from "@/lib/progress";
import { deleteRecording, getRecording, saveRecording } from "@/lib/audio-store";
import type { Entry, Example } from "@/lib/types";
import { SpeakButton } from "./SpeakButton";

export function Loading({ error }: { error?: string | null }) {
  if (error) return <div className="notice err">Impossible de charger le dictionnaire : {error}</div>;
  return <p className="muted">Chargement du dictionnaire…</p>;
}

export function FavButton({ id }: { id: string }) {
  const p = useProgress();
  const on = p.favorites.includes(id);
  return (
    <button
      className="icon-btn"
      onClick={(e) => {
        e.preventDefault();
        toggleFavorite(id);
      }}
      aria-pressed={on}
      title={on ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      {on ? "★" : "☆"}
    </button>
  );
}

export function EntryRow({ entry }: { entry: Entry }) {
  return (
    <Link href={`/dictionnaire/${entry.id}`} className="list-entry">
      <span className="mar">{entry.word}</span>
      {entry.pos[0] && <span className="badge">{entry.pos[0]}</span>}
      <span className="gloss">{shortGloss(entry.gloss, 90)}</span>
      <FavButton id={entry.id} />
    </Link>
  );
}

export function ExampleView({ ex }: { ex: Example }) {
  return (
    <div className="example">
      <div className="mar">{ex.mar}</div>
      <div className="fr">{ex.fr}</div>
    </div>
  );
}

/** Lecture à voix haute (voix Gemini si une clé est enregistrée, sinon voix du téléphone). */
export function SpeakFr({ text }: { text: string }) {
  return <SpeakButton text={text} compact label="Écouter" />;
}

/**
 * Enregistrer / écouter la prononciation d'un mot (voix d'un locuteur natif),
 * stockée sur l'appareil. Base d'un futur corpus audio Marba.
 */
export function Recorder({ storageKey }: { storageKey: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    let current: string | null = null;
    getRecording(storageKey)
      .then((b) => {
        if (b) {
          current = URL.createObjectURL(b);
          setUrl(current);
        }
      })
      .catch(() => {});
    return () => {
      if (current) URL.revokeObjectURL(current);
    };
  }, [storageKey]);

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        await saveRecording(storageKey, blob);
        setUrl(URL.createObjectURL(blob));
        setRec(null);
      };
      mr.start();
      setRec(mr);
      setTimeout(() => mr.state === "recording" && mr.stop(), 15000);
    } catch {
      setErr("Micro indisponible ou refusé.");
    }
  }

  return (
    <div className="row">
      {url && <audio controls src={url} preload="none" style={{ height: 36, maxWidth: 240 }} />}
      {rec ? (
        <button className="btn btn-sm btn-primary" onClick={() => rec.stop()}>
          ⏹ Arrêter
        </button>
      ) : (
        <button className="btn btn-sm" onClick={start} title="Enregistrer la prononciation (15 s max.)">
          🎙️ {url ? "Réenregistrer" : "Enregistrer la prononciation"}
        </button>
      )}
      {url && !rec && (
        <button
          className="btn btn-sm btn-ghost"
          onClick={async () => {
            await deleteRecording(storageKey);
            setUrl(null);
          }}
        >
          Supprimer
        </button>
      )}
      {err && <span className="small" style={{ color: "var(--danger)" }}>{err}</span>}
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((100 * value) / max) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}
