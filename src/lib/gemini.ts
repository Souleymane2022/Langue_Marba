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

/**
 * Modèles de secours, essayés dans l'ordre si le modèle choisi est surchargé (erreur 5xx),
 * introuvable (404) ou si son quota gratuit est épuisé (429 : les quotas sont propres à chaque modèle).
 */
export const GEMINI_FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

const RETRYABLE = (status: number) => status === 404 || status === 429 || status >= 500;
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Arrêté", "AbortError"));
    });
  });

export async function streamGemini({ apiKey, model, system, messages, signal, onText }: GeminiRequest): Promise<void> {
  const ai = new GoogleGenAI({ apiKey });
  const first = model || DEFAULT_GEMINI_MODEL;
  // le modèle choisi est réessayé une fois (surcharge passagère), puis les modèles de secours
  const attempts = [first, first, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== first)];
  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const current = attempts[i];
    let streamed = false;
    try {
      const stream = await ai.models.generateContentStream({
        model: current,
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        config: { systemInstruction: system, maxOutputTokens: 8192, abortSignal: signal },
      });
      let finish: string | undefined;
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          streamed = true;
          onText(text);
        }
        finish = chunk.candidates?.[0]?.finishReason ?? finish;
      }
      if (finish === "MAX_TOKENS") onText("\n\n_(Réponse interrompue car trop longue — demandez la suite.)_");
      else if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT") onText("\n\n_Cette demande n'a pas pu être traitée. Reformulez-la, s'il vous plaît._");
      if (current !== first) onText(`\n\n_(Le modèle ${first} était indisponible : réponse fournie par ${current}.)_`);
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      lastError = err;
      // on ne change pas de modèle au milieu d'une réponse déjà commencée
      const retry = !streamed && err instanceof ApiError && RETRYABLE(err.status) && i + 1 < attempts.length;
      if (!retry) break;
      // même modèle (surcharge) : petite pause ; quota / modèle absent : on passe directement au suivant
      if (attempts[i + 1] === current) {
        if (err.status === 404 || err.status === 429) i++;
        else await sleep(1500, signal);
      }
    }
  }
  throw new Error(geminiErrorMessage(lastError));
}

/** Message d'erreur renvoyé par Google (champ error.message du JSON), pour le diagnostic. */
function googleDetail(err: ApiError): string {
  const m = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(err.message);
  const detail = (m ? m[1].replace(/\\n/g, " ").replace(/\\"/g, '"') : err.message).trim();
  return detail ? ` Détail : ${detail.slice(0, 200)}` : "";
}

export function geminiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) return "Clé Gemini invalide. Vérifiez-la dans les réglages de l'IA.";
    if (err.status === 401 || err.status === 403) return `Clé Gemini refusée (droits insuffisants ou API non activée).${googleDetail(err)}`;
    if (err.status === 404) return `Modèle Gemini introuvable. Choisissez un autre modèle dans les réglages de l'IA.${googleDetail(err)}`;
    if (err.status === 429)
      return `Limite gratuite de Gemini atteinte sur tous les modèles essayés. Réessayez dans une minute (ou demain si le quota du jour est épuisé).${googleDetail(err)}`;
    if (err.status >= 500)
      return `Les serveurs de Gemini sont surchargés en ce moment (erreur ${err.status}), même après plusieurs essais. Réessayez dans quelques minutes, ou choisissez un autre modèle dans les réglages.${googleDetail(err)}`;
    return `Erreur Gemini (${err.status}).${googleDetail(err)}`;
  }
  return `Connexion à Gemini impossible. Vérifiez votre connexion Internet.${err instanceof Error && err.message ? ` Détail : ${err.message.slice(0, 200)}` : ""}`;
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
