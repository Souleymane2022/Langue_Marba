"use client";

import { useSyncExternalStore } from "react";
import { getAiSettings } from "./ai-settings";
import { chunkText, pcmToWav, speechText } from "./speech-text";

export { chunkText, pcmToWav, speechText };

/**
 * Lecture à voix haute des réponses.
 *  - Avec une clé Gemini : voix neuronale naturelle de Google (modèles « TTS »).
 *  - Sinon, ou si le quota est épuisé : voix française du téléphone.
 *
 * Limite honnête : aucune synthèse vocale ne connaît la langue Marba. Le français est lu
 * naturellement ; les mots Marba sont prononcés d'après leur orthographe (approximation).
 * Les enregistrements de locuteurs natifs (bouton « Enregistrer la prononciation ») restent la référence.
 */

/** Voix Gemini au ton posé et professionnel (noms de voix prédéfinies de Google). */
export const GEMINI_VOICES: { id: string; label: string }[] = [
  { id: "Charon", label: "Charon — voix masculine, posée et informative (recommandée)" },
  { id: "Kore", label: "Kore — voix féminine, ferme et assurée" },
  { id: "Sadaltager", label: "Sadaltager — voix masculine, ton d'expert" },
  { id: "Schedar", label: "Schedar — voix masculine, calme et régulière" },
  { id: "Sulafat", label: "Sulafat — voix féminine, chaleureuse" },
  { id: "Erinome", label: "Erinome — voix féminine, claire" },
  { id: "Iapetus", label: "Iapetus — voix masculine, claire" },
  { id: "Achird", label: "Achird — voix masculine, amicale" },
];
export const DEFAULT_VOICE = "Charon";

/** Modèles de synthèse vocale, du meilleur au plus économe (quotas gratuits distincts). */
export const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"];

const STYLE =
  "Lis le texte suivant en français, d'une voix posée, claire et professionnelle, comme un présentateur de radio " +
  "ou un enseignant expérimenté : rythme calme, articulation nette, intonation naturelle. Les mots en langue marba " +
  "sont écrits comme ils se prononcent (c se dit « tch », j se dit « dj », ŋ se dit « ng »). Texte :\n\n";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

class TtsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Synthèse d'un morceau de texte avec Gemini ; essaie les modèles vocaux dans l'ordre. */
async function geminiSpeech(apiKey: string, text: string, voice: string, preferred: string, signal: AbortSignal): Promise<Blob> {
  const { GoogleGenAI, ApiError } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const models = [...new Set([preferred, ...TTS_MODELS].filter(Boolean))];
  let last: unknown;
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: STYLE + text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          abortSignal: signal,
        },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new TtsError("Réponse audio vide", 500);
      const mime = part.inlineData.mimeType ?? "audio/L16;rate=24000";
      const bytes = base64ToBytes(part.inlineData.data);
      if (/L16|pcm/i.test(mime)) return pcmToWav(bytes, Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000));
      return new Blob([bytes as BlobPart], { type: mime });
    } catch (err) {
      if (signal.aborted || (err instanceof Error && err.name === "AbortError")) throw err;
      last = err;
      const status = err instanceof ApiError ? err.status : err instanceof TtsError ? err.status : 0;
      if (!(status === 404 || status === 429 || status >= 500)) break; // autre modèle inutile (clé, voix…)
    }
  }
  const status = last instanceof Error && "status" in last ? Number((last as { status: number }).status) : 0;
  throw new TtsError(status === 429 ? "quota" : "indisponible", status);
}

/** Meilleure voix française disponible sur l'appareil (voix « naturelles » de préférence). */
function bestDeviceVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online|premium|enhanced|google/i.test(v.name) ? 10 : 0) + (v.lang === "fr-FR" ? 2 : 0) + (v.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

function deviceSpeak(text: string, rate: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) return reject(new Error("Lecture vocale non disponible sur cet appareil."));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = rate;
    const v = bestDeviceVoice();
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(e.error)));
    signal.addEventListener("abort", () => window.speechSynthesis.cancel());
    window.speechSynthesis.speak(u);
  });
}

// ── Lecteur unique : une seule lecture à la fois dans toute l'application ──────────────

export type SpeakerState = { status: "idle" | "loading" | "playing"; id: string | null; notice: string | null };
let state: SpeakerState = { status: "idle", id: null, notice: null };
const listeners = new Set<() => void>();
let current: { abort: AbortController; audio?: HTMLAudioElement } | null = null;

function set(next: Partial<SpeakerState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useSpeaker(): SpeakerState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function stopSpeaking() {
  if (current) {
    current.abort.abort();
    current.audio?.pause();
    current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  set({ status: "idle", id: null });
}

function playBlob(blob: Blob, rate: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    if (current) current.audio = audio;
    const done = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onended = done;
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Lecture audio impossible"));
    };
    signal.addEventListener("abort", () => {
      audio.pause();
      done();
    });
    audio.play().catch(reject);
  });
}

/**
 * Lit un texte (Markdown accepté) à voix haute. `id` identifie le bouton qui a lancé la lecture.
 * Les morceaux suivants sont préparés pendant la lecture du précédent, pour un enchaînement fluide.
 */
export async function speak(markdown: string, id = "default"): Promise<void> {
  stopSpeaking();
  const abort = new AbortController();
  current = { abort };
  const s = getAiSettings();
  const rate = s.speechRate || 1;
  const chunks = chunkText(speechText(markdown));
  if (!chunks.length) return;
  set({ status: "loading", id, notice: null });

  let useDevice = !s.geminiKey;
  try {
    if (!useDevice) {
      const voice = s.voiceName || DEFAULT_VOICE;
      const synth = (i: number) => geminiSpeech(s.geminiKey, chunks[i], voice, s.ttsModel, abort.signal);
      let next: Promise<Blob> | null = synth(0);
      for (let i = 0; i < chunks.length; i++) {
        let blob: Blob;
        try {
          blob = await next!;
        } catch (err) {
          if (abort.signal.aborted) return;
          // Voix Gemini indisponible (quota gratuit épuisé…) : on continue avec la voix du téléphone.
          set({
            notice:
              (err as TtsError).message === "quota"
                ? "Quota gratuit de la voix Gemini atteint : lecture avec la voix du téléphone."
                : "Voix Gemini indisponible pour le moment : lecture avec la voix du téléphone.",
          });
          useDevice = true;
          for (let j = i; j < chunks.length && !abort.signal.aborted; j++) {
            set({ status: "playing" });
            await deviceSpeak(chunks[j], rate, abort.signal);
          }
          return;
        }
        next = i + 1 < chunks.length ? synth(i + 1) : null;
        next?.catch(() => {}); // l'erreur éventuelle est traitée au tour suivant
        if (abort.signal.aborted) return;
        set({ status: "playing" });
        await playBlob(blob, rate, abort.signal);
      }
    } else {
      for (const c of chunks) {
        if (abort.signal.aborted) return;
        set({ status: "playing" });
        await deviceSpeak(c, rate, abort.signal);
      }
    }
  } catch (err) {
    if (!abort.signal.aborted) set({ notice: `Lecture impossible : ${(err as Error).message}` });
  } finally {
    if (current?.abort === abort) {
      current = null;
      set({ status: "idle" }); // on garde l'id : le message éventuel reste affiché près du bouton
    }
  }
}
