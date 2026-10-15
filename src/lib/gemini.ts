import { ApiError, GoogleGenAI } from "@google/genai";
import type { ChatTurn } from "./ai-prompt.ts";

/**
 * Accès à Gemini (Google). Fonctionne côté serveur (clé GEMINI_API_KEY)
 * et directement dans le navigateur avec la clé personnelle de l'utilisateur
 * — ce qui permet d'avoir l'IA même sur GitHub Pages, sans serveur.
 */

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest"; // alias Google : toujours le Flash le plus récent

export interface GeminiRequest {
  apiKey: string;
  model?: string;
  system: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
  onText: (delta: string) => void;
}

export async function streamGemini({ apiKey, model, system, messages, signal, onText }: GeminiRequest): Promise<void> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const stream = await ai.models.generateContentStream({
      model: model || DEFAULT_GEMINI_MODEL,
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      config: { systemInstruction: system, maxOutputTokens: 8192, abortSignal: signal },
    });
    let finish: string | undefined;
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) onText(text);
      finish = chunk.candidates?.[0]?.finishReason ?? finish;
    }
    if (finish === "MAX_TOKENS") onText("\n\n_(Réponse interrompue car trop longue — demandez la suite.)_");
    else if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT") onText("\n\n_Cette demande n'a pas pu être traitée. Reformulez-la, s'il vous plaît._");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new Error(geminiErrorMessage(err));
  }
}

export function geminiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) return "Clé Gemini invalide. Vérifiez-la dans les réglages de l'IA.";
    if (err.status === 401 || err.status === 403) return "Clé Gemini refusée (droits insuffisants ou API non activée).";
    if (err.status === 404) return "Modèle Gemini introuvable. Choisissez un autre modèle dans les réglages de l'IA.";
    if (err.status === 429) return "Limite gratuite de Gemini atteinte pour le moment. Réessayez dans une minute (ou demain si le quota du jour est épuisé).";
    if (err.status >= 500) return "Le service Gemini est momentanément indisponible. Réessayez.";
    return `Erreur Gemini (${err.status}).`;
  }
  return "Connexion à Gemini impossible. Vérifiez votre connexion Internet.";
}

/** Modèles Gemini utilisables pour le texte avec cette clé (pour le menu de choix). */
export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });
  const names: string[] = [];
  try {
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      const name = (m.name ?? "").replace(/^models\//, "");
      if (/gemini/.test(name) && /flash|pro/.test(name) && !/image|tts|audio|live|embedding|vision/.test(name) && (m.supportedActions ?? ["generateContent"]).includes("generateContent")) {
        names.push(name);
      }
    }
  } catch (err) {
    throw new Error(geminiErrorMessage(err));
  }
  return names.sort();
}
