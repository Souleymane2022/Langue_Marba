"use client";

import type { AiRequestBody } from "./ai-modes";
import { withBase } from "./base-path";

/**
 * Adresse de l'API de l'assistant. Sur un serveur Node : l'API intégrée.
 * Sur GitHub Pages (site statique) : une API hébergée ailleurs, définie par
 * NEXT_PUBLIC_AI_ENDPOINT au moment de la construction ; sinon l'IA est désactivée.
 */
const AI_ENDPOINT =
  process.env.NEXT_PUBLIC_AI_ENDPOINT || (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "" : withBase("/api/ai/"));

export const AI_AVAILABLE = AI_ENDPOINT !== "";

/** Appelle l'API de l'assistant et transmet le texte au fur et à mesure (streaming). */
export async function streamAi(body: AiRequestBody, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  if (!AI_AVAILABLE) {
    throw new Error(
      "L'assistant IA n'est pas activé sur cette version en ligne. Le dictionnaire, les leçons, les quiz et la traduction mot à mot restent disponibles.",
    );
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Vous êtes hors-ligne. L'assistant IA nécessite Internet ; le dictionnaire et la traduction mot à mot restent disponibles.");
  }
  const res = await fetch(AI_ENDPOINT, {
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
