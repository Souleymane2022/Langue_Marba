"use client";

import type { AiRequestBody } from "./ai-modes";

/** Appelle l'API de l'assistant et transmet le texte au fur et à mesure (streaming). */
export async function streamAi(body: AiRequestBody, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Vous êtes hors-ligne. L'assistant IA nécessite Internet ; le dictionnaire et la traduction mot à mot restent disponibles.");
  }
  const res = await fetch("/api/ai", {
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
