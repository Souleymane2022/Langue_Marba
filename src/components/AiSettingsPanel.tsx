"use client";

import { useState } from "react";
import { SERVER_AI_AVAILABLE } from "@/lib/ai-client";
import { DEFAULT_GEMINI_MODEL, saveAiSettings, useAiSettings } from "@/lib/ai-settings";

const listGeminiModels = async (key: string) => (await import("@/lib/gemini")).listGeminiModels(key);

/** Réglage de la clé Gemini personnelle (gratuite) — stockée uniquement sur l'appareil. */
export function AiSettingsPanel() {
  const settings = useAiSettings();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const show = open || (!SERVER_AI_AVAILABLE && !settings.geminiKey);

  async function test(k: string) {
    setOpen(true); // garder le panneau ouvert pour afficher le résultat et le choix du modèle
    setBusy(true);
    setStatus(null);
    try {
      const list = await listGeminiModels(k);
      setModels(list);
      saveAiSettings({ geminiKey: k, geminiModel: settings.geminiModel });
      setKey("");
      setStatus({ ok: true, msg: `Clé valide ✔ — ${list.length} modèle(s) disponible(s). L'assistant IA est prêt.` });
    } catch (e) {
      setStatus({ ok: false, msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <button
        className="row"
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
        onClick={() => setOpen(!show)}
        aria-expanded={show}
      >
        <span style={{ fontSize: "1.3rem" }}>⚙️</span>
        <span style={{ flex: 1 }}>
          <strong>Réglages de l&apos;IA</strong>
          <br />
          <span className="small muted">
            {settings.geminiKey
              ? `Clé Gemini personnelle active (…${settings.geminiKey.slice(-4)}) · modèle ${settings.geminiModel || DEFAULT_GEMINI_MODEL}`
              : SERVER_AI_AVAILABLE
                ? "IA fournie par le site. Vous pouvez aussi utiliser votre propre clé Gemini gratuite."
                : "Ajoutez votre clé Gemini gratuite pour activer l'assistant."}
          </span>
        </span>
        <span>{show ? "▲" : "▼"}</span>
      </button>

      {show && (
        <div className="stack">
          {!settings.geminiKey && (
            <ol className="small" style={{ margin: 0, paddingLeft: "1.2em" }}>
              <li>
                Ouvrez{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  aistudio.google.com/apikey
                </a>{" "}
                et connectez-vous avec un compte Google.
              </li>
              <li>Cliquez sur « Create API key » (gratuit, sans carte bancaire), puis copiez la clé.</li>
              <li>Collez-la ci-dessous et cliquez sur « Enregistrer ».</li>
            </ol>
          )}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (key.trim()) test(key.trim());
            }}
          >
            <input
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              type="password"
              autoComplete="off"
              placeholder={settings.geminiKey ? "Remplacer la clé…" : "Collez votre clé Gemini (AIza…)"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !key.trim()}>
              {busy ? "Vérification…" : "Enregistrer"}
            </button>
          </form>

          {settings.geminiKey && (
            <div className="row">
              <label className="field" style={{ flex: 1, minWidth: 200 }}>
                Modèle
                <select
                  className="select"
                  value={settings.geminiModel}
                  onChange={(e) => saveAiSettings({ ...settings, geminiModel: e.target.value })}
                  onFocus={() => !models.length && listGeminiModels(settings.geminiKey).then(setModels).catch(() => {})}
                >
                  <option value="">{DEFAULT_GEMINI_MODEL} (recommandé, toujours à jour)</option>
                  {settings.geminiModel && !models.includes(settings.geminiModel) && <option value={settings.geminiModel}>{settings.geminiModel}</option>}
                  {models.filter((m) => m !== DEFAULT_GEMINI_MODEL).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-ghost" style={{ alignSelf: "flex-end" }} onClick={() => (saveAiSettings({ geminiKey: "", geminiModel: "" }), setStatus(null))}>
                Supprimer la clé
              </button>
            </div>
          )}

          {status && <div className={`notice ${status.ok ? "ok" : "err"}`}>{status.msg}</div>}

          <p className="small muted" style={{ margin: 0 }}>
            🔒 La clé reste uniquement sur cet appareil (elle n&apos;est envoyée qu&apos;à Google). Ne l&apos;enregistrez pas sur un téléphone
            partagé. ⚠️ Avec l&apos;offre gratuite, Google peut utiliser les textes envoyés pour améliorer ses services : n&apos;y mettez pas
            d&apos;informations personnelles (noms de patients, etc.). Le nombre de questions gratuites par jour est limité.
          </p>
        </div>
      )}
    </div>
  );
}
