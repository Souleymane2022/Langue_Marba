import Anthropic from "@anthropic-ai/sdk";
import dictionary from "@/data/dictionary.json";
import proverbs from "@/data/proverbs.json";
import { AI_MODE_BY_ID, MAX_HISTORY, MAX_INPUT, type AiRequestBody } from "@/lib/ai-modes";
import { INSTRUCTIONS, buildLexicon, buildUserMessage, retrieveContext } from "@/lib/ai-prompt";
import { buildIndex } from "@/lib/search";
import { SECTOR_BY_ID } from "@/lib/sectors";
import type { Dictionary, Proverb } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-5-5";
const dict = dictionary as unknown as Dictionary;
const ctx = { index: buildIndex(dict.entries), entries: dict.entries, proverbs: proverbs as Proverb[] };
// Préfixe stable (instructions + lexique complet) : mis en cache côté API pour réduire coût et latence.
const LEXICON = buildLexicon(dict.entries);

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

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return error(
      "L'assistant IA n'est pas encore configuré sur ce serveur (variable ANTHROPIC_API_KEY manquante). Le dictionnaire, les leçons et la traduction mot à mot restent disponibles.",
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
  const mode = AI_MODE_BY_ID.get(body.mode);
  const input = typeof body.input === "string" ? body.input.trim().slice(0, MAX_INPUT) : "";
  if (!mode) return error("Fonction inconnue.", 400);
  if (!input && !mode.sector) return error("Écrivez votre demande.", 400);
  const sector = body.sector ? SECTOR_BY_ID.get(body.sector) : undefined;

  const history: Anthropic.Beta.BetaMessageParam[] = [];
  if (mode.chat && Array.isArray(body.history)) {
    for (const m of body.history.slice(-MAX_HISTORY)) {
      if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()) {
        history.push({ role: m.role, content: m.content.slice(0, 6000) });
      }
    }
    while (history.length && history[0].role !== "user") history.shift();
  }

  const context = retrieveContext(ctx, `${input} ${sector?.name ?? ""}`.trim(), sector?.id);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history,
    { role: "user", content: buildUserMessage(mode.id, input, context, sector?.name) },
  ];

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

  const encoder = new TextEncoder();
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

  return new Response(readable, {
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
