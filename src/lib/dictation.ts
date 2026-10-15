"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dictée vocale : l'utilisateur parle, le texte s'écrit tout seul.
 * Utilise la reconnaissance vocale du navigateur (Chrome sur Android et ordinateur, Safari, Edge).
 * La reconnaissance est réglée sur le français ; les mots Marba dictés peuvent être mal transcrits.
 */
interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Micro refusé : autorisez le micro pour ce site dans les réglages du navigateur.",
  "service-not-allowed": "Micro refusé : autorisez le micro pour ce site dans les réglages du navigateur.",
  "no-speech": "Je n'ai rien entendu. Appuyez sur le micro et parlez.",
  "audio-capture": "Aucun micro détecté.",
  network: "La dictée nécessite une connexion Internet.",
};

export function useDictation(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => setSupported(!!getRecognition()), []);

  function start() {
    const R = getRecognition();
    if (!R) return;
    setError(null);
    const r = new R();
    r.lang = "fr-FR";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      cb.current((finalText + interim).trim(), false);
    };
    r.onerror = (e) => setError(ERRORS[e.error] ?? (e.error === "aborted" ? null : `Dictée impossible (${e.error}).`));
    r.onend = () => {
      setListening(false);
      rec.current = null;
      if (finalText.trim()) cb.current(finalText.trim(), true);
    };
    rec.current = r;
    setListening(true);
    r.start();
  }

  function stop() {
    rec.current?.stop();
  }

  return { supported, listening, error, start, stop };
}
