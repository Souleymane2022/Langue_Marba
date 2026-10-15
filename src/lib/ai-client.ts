"use client";

import type { AiRequestBody } from "./ai-modes";
import { INSTRUCTIONS, buildLexicon, prepareRequest } from "./ai-prompt";
import { getAiSettings, useAiSettings } from "./ai-settings";
import { withBase } from "./base-path";
import { loadData } from "./data-client";

/**
 * L'assistant peut fonctionner de deux façons :
 *  1. avec la clé Gemini personnelle de l'utilisateur, appelée directement depuis le navigateur
 *     (fonctionne partout, y compris sur GitHub Pages) ;
 *  2. via l'API du serveur (/api/ai/, ou NEXT_PUBLIC_AI_ENDPOINT pour la version statique),
 *     qui garde la clé du propriétaire du site secrète.
 */
const SERVER_ENDPOINT =
  process.env.NEXT_PUBLIC_AI_ENDPOINT || (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "" : withBase("/api/ai/"));

export const SERVER_AI_AVAILABLE = SERVER_ENDPOINT !== "";

/** L'IA est-elle utilisable (clé personnelle ou serveur) ? */
export function useAiAvailable(): boolean {
  const s = useAiSettings();
  return SERVER_AI_AVAILABLE || !!s.geminiKey;
}

let lexicon: string | null = null;

async function streamWithPersonalKey(body: AiRequestBody, apiKey: string, model: string, onText: (full: string) => void, signal?: AbortSignal) {
  const data = await loadData();
  lexicon ??= buildLexicon(data.dict.entries);
  const prepared = prepareRequest({ index: data.index, entries: data.dict.entries, proverbs: data.proverbs }, body);
  if (!prepared.ok) throw new Error(prepared.error);
  const { streamGemini } = await import("./gemini"); // SDK Google chargé seulement à l'usage
  let full = "";
  await streamGemini({
    apiKey,
    model,
    system: `${INSTRUCTIONS}\n\n${lexicon}`,
    messages: prepared.messages,
    signal,
    onText: (t) => {
      full += t;
      onText(full);
    },
  });
  return full;
}

/** Appelle l'assistant et transmet le texte au fur et à mesure (streaming). */
export async function streamAi(body: AiRequestBody, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Vous êtes hors-ligne. L'assistant IA nécessite Internet ; le dictionnaire et la traduction mot à mot restent disponibles.");
  }
  const settings = getAiSettings();
  if (settings.geminiKey) return streamWithPersonalKey(body, settings.geminiKey, settings.geminiModel, onText, signal);
  if (!SERVER_AI_AVAILABLE) {
    throw new Error(
      "L'assistant IA n'est pas encore activé. Ajoutez votre clé Gemini gratuite dans « Réglages de l'IA » (page Assistant IA).",
    );
  }

  const res = await fetch(SERVER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {
      /* corps non JSON */
    }
    throw new Error(msg);
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  return full;
}
