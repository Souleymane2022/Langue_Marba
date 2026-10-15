"use client";

import { useId } from "react";
import { speak, stopSpeaking, useSpeaker } from "@/lib/tts";

/** Bouton « Écouter » : lit le texte avec la voix Gemini (ou celle du téléphone). */
export function SpeakButton({
  text,
  label = "Écouter",
  compact = false,
  speakId,
}: {
  text: string;
  label?: string;
  compact?: boolean;
  /** identifiant stable, pour suivre une lecture lancée automatiquement */
  speakId?: string;
}) {
  const autoId = useId();
  const id = speakId ?? autoId;
  const sp = useSpeaker();
  const mine = sp.id === id;
  const busy = mine && sp.status !== "idle";
  return (
    <span className="row" style={{ gap: 6 }}>
      <button
        type="button"
        className={compact ? "icon-btn" : "btn btn-sm"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (busy) stopSpeaking();
          else void speak(text, id);
        }}
        title={busy ? "Arrêter la lecture" : label}
        aria-label={busy ? "Arrêter la lecture" : label}
      >
        {busy ? (sp.status === "loading" ? "⏳" : "⏹") : "🔊"}
        {!compact && <span>{busy ? (sp.status === "loading" ? "Préparation de la voix…" : "Arrêter") : label}</span>}
      </button>
      {mine && sp.notice && <span className="small muted">{sp.notice}</span>}
    </span>
  );
}
