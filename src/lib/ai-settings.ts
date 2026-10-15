"use client";

import { useSyncExternalStore } from "react";

/**
 * Réglages IA de l'utilisateur, conservés uniquement sur son appareil.
 * Avec une clé Gemini personnelle (gratuite), l'assistant appelle Google
 * directement depuis le navigateur : aucun serveur n'est nécessaire.
 */
export interface AiSettings {
  geminiKey: string;
  geminiModel: string;
}

/** Alias maintenu par Google : pointe toujours vers le modèle Flash le plus récent. */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

const KEY = "marba:ai-settings:v1";
const EMPTY: AiSettings = { geminiKey: "", geminiModel: "" };
let state: AiSettings = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): AiSettings {
  if (typeof window === "undefined") return EMPTY;
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
    } catch {
      state = EMPTY;
    }
  }
  return state;
}

export function getAiSettings(): AiSettings {
  return read();
}

export function saveAiSettings(next: AiSettings) {
  state = { geminiKey: next.geminiKey.trim(), geminiModel: next.geminiModel.trim() };
  try {
    if (state.geminiKey || state.geminiModel) window.localStorage.setItem(KEY, JSON.stringify(state));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : réglage gardé en mémoire */
  }
  listeners.forEach((l) => l());
}

export function useAiSettings(): AiSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}
