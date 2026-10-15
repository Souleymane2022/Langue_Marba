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
  /** voix Gemini (ex. « Charon ») */
  voiceName: string;
  /** modèle de synthèse vocale choisi ("" = automatique) */
  ttsModel: string;
  /** vitesse de lecture (0.8 à 1.2) */
  speechRate: number;
  /** mode vocal : lire automatiquement les réponses et envoyer après la dictée */
  autoSpeak: boolean;
}

/** Alias maintenu par Google : pointe toujours vers le modèle Flash le plus récent. */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

const KEY = "marba:ai-settings:v1";
const EMPTY: AiSettings = { geminiKey: "", geminiModel: "", voiceName: "", ttsModel: "", speechRate: 1, autoSpeak: false };
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

export function saveAiSettings(next: Partial<AiSettings>) {
  state = { ...read(), ...next };
  state.geminiKey = state.geminiKey.trim();
  state.geminiModel = state.geminiModel.trim();
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
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
