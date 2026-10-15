import Anthropic from "@anthropic-ai/sdk";
import dictionary from "@/data/dictionary.json";
import proverbs from "@/data/proverbs.json";
import type { AiRequestBody } from "@/lib/ai-modes";
import { INSTRUCTIONS, buildLexicon, prepareRequest } from "@/lib/ai-prompt";
import { streamGemini } from "@/lib/gemini";
import { buildIndex } from "@/lib/search";
import type { Dictionary, Proverb } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-5-5";
const dict = dictionary as unknown as Dictionary;
const ctx = { index: buildIndex(dict.entries), entries: dict.entries, proverbs: proverbs as Proverb[] };
// Préfixe stable (instructions + lexique complet) : mis en cache par le fournisseur pour réduire coût et latence.
const LEXICON = buildLexicon(dict.entries);

/**
 * Fournisseur d'IA côté serveur : Gemini (clé gratuite Google AI Studio) ou Claude (Anthropic).
 * AI_PROVIDER force le choix ; sinon Gemini si GEMINI_API_KEY est défini, puis Claude.
 */
function aiProvider(): "gemini" | "anthropic" | null {
  const forced = process.env.AI_PROVIDER;
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (forced === "anthropic" && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  return null;
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// Limitation simple du nombre de requêtes par IP (mémoire du processus).
const LIMIT = Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 60);
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

// Origines autorisées à appeler l'API depuis un autre site (ex. la version GitHub Pages) :
// AI_ALLOWED_ORIGINS=https://souleymane2022.github.io
const ALLOWED_ORIGINS = (process.env.AI_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function isSameHost(origin: string, req: Request): boolean {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false; // Origin « null » ou mal formée
  }
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req);
  const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: cors });
  // Un autre site non autorisé ne peut pas consommer le crédit IA (le navigateur bloquerait la réponse, mais l'appel serait facturé).
  const origin = req.headers.get("origin");
  if (origin && !cors["Access-Control-Allow-Origin"] && !isSameHost(origin, req)) {
    return error("Origine non autorisée.", 403);
  }

  const provider = aiProvider();
  if (!provider) {
    return error(
      "L'assistant IA n'est pas encore configuré sur ce serveur (variable GEMINI_API_KEY ou ANTHROPIC_API_KEY manquante). Le dictionnaire, les leçons et la traduction mot à mot restent disponibles.",
      503,
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return error("Trop de demandes. Réessayez dans un moment.", 429);

  let body: AiRequestBody;
  try {
    body = (await req.json()) as AiRequestBody;
  } catch {
    return error("Requête invalide.", 400);
  }
  const prepared = prepareRequest(ctx, body);
  if (!prepared.ok) return error(prepared.error, prepared.status);
  const headers = { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const encoder = new TextEncoder();

  if (provider === "gemini") {
    const abort = new AbortController();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await streamGemini({
            apiKey: process.env.GEMINI_API_KEY!,
            model: process.env.GEMINI_MODEL,
            system: `${INSTRUCTIONS}\n\n${LEXICON}`,
            messages: prepared.messages,
            signal: abort.signal,
            onText: (t) => controller.enqueue(encoder.encode(t)),
          });
        } catch (err) {
          console.error("[api/ai gemini]", err);
          if ((err as Error).name !== "AbortError") controller.enqueue(encoder.encode(`\n\n⚠️ ${(err as Error).message}`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        abort.abort();
      },
    });
    return new Response(readable, { headers });
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = prepared.messages;

  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: INSTRUCTIONS },
      { type: "text", text: LEXICON, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n_Cette demande n'a pas pu être traitée. Reformulez-la, s'il vous plaît._"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_(Réponse interrompue car trop longue — demandez la suite.)_"));
        }
      } catch (err) {
        let msg = "Erreur de l'assistant. Réessayez.";
        if (err instanceof Anthropic.AuthenticationError) msg = "Clé API invalide sur le serveur.";
        else if (err instanceof Anthropic.RateLimitError) msg = "Le service IA est très sollicité. Réessayez dans une minute.";
        else if (err instanceof Anthropic.APIConnectionError) msg = "Connexion au service IA impossible. Vérifiez la connexion Internet du serveur.";
        else if (err instanceof Anthropic.APIError) msg = `Erreur du service IA (${err.status ?? "?"}).`;
        console.error("[api/ai]", err);
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, { headers });
}
