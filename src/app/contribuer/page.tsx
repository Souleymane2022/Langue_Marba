"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addContribution, removeContribution, useProgress, type Contribution } from "@/lib/progress";
import { getRecording, listRecordingKeys } from "@/lib/audio-store";

const KINDS: { id: Contribution["kind"]; label: string }[] = [
  { id: "mot", label: "Nouveau mot" },
  { id: "correction", label: "Correction d'un mot existant" },
  { id: "exemple", label: "Nouvelle phrase d'exemple" },
  { id: "proverbe", label: "Proverbe, conte ou chant" },
];

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

function ContributeInner() {
  const params = useSearchParams();
  const p = useProgress();
  const [kind, setKind] = useState<Contribution["kind"]>(params.get("id") ? "correction" : "mot");
  const [word, setWord] = useState(params.get("mot") ?? "");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [note, setNote] = useState("");
  const [village, setVillage] = useState("");
  const [sent, setSent] = useState(false);
  const [exporting, setExporting] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;
    addContribution({
      kind,
      word: word.trim(),
      meaning: meaning.trim(),
      example: example.trim() || undefined,
      note: note.trim() || undefined,
      village: village.trim() || undefined,
      author: p.profile.name || undefined,
      entryId: params.get("id") ?? undefined,
    });
    setWord("");
    setMeaning("");
    setExample("");
    setNote("");
    setSent(true);
  }

  async function exportAll() {
    setExporting(true);
    try {
      const keys = (await listRecordingKeys()).map(String);
      const audio: Record<string, string> = {};
      for (const k of keys) {
        const b = await getRecording(k);
        if (b) audio[k] = await blobToBase64(b);
      }
      const payload = { app: "Vun Marbana", exportedAt: new Date().toISOString(), contributions: p.contributions, audio };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `contributions-marba-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="stack">
      <h1>🤝 Contribuer au Marba</h1>
      <p>
        Le Marba vit dans la bouche de ceux qui le parlent. Ajoutez les mots qui manquent (termes de santé, d&apos;école, d&apos;administration,
        mots nouveaux…), corrigez des erreurs, enregistrez des prononciations. Chaque contribution sera relue par des locuteurs et des
        linguistes avant d&apos;entrer dans le dictionnaire.
      </p>

      <form className="card stack" onSubmit={submit}>
        <div className="row">
          {KINDS.map((k) => (
            <button type="button" key={k.id} className={`chip ${kind === k.id ? "active" : ""}`} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <label className="field">
          {kind === "proverbe" ? "Texte en Marba" : "Mot ou expression en Marba"} *
          <input className="input" value={word} onChange={(e) => setWord(e.target.value)} required />
        </label>
        <label className="field">
          Sens / traduction en français *
          <input className="input" value={meaning} onChange={(e) => setMeaning(e.target.value)} required />
        </label>
        <label className="field">
          Phrase d&apos;exemple (Marba : français)
          <input className="input" value={example} onChange={(e) => setExample(e.target.value)} placeholder="Ex. : An i asine : je vais au champ" />
        </label>
        <label className="field">
          Village / région où ce mot est employé
          <input className="input" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Ex. : Baktchoro" />
        </label>
        <label className="field">
          Remarque (prononciation, variante, contexte…)
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit">
          Enregistrer ma contribution (+10 points)
        </button>
        {sent && <div className="notice ok">Merci ! Votre contribution est enregistrée sur cet appareil. Pensez à l&apos;exporter.</div>}
      </form>

      <section className="card stack">
        <div className="row">
          <h2 style={{ margin: 0 }}>Mes contributions ({p.contributions.length})</h2>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={exportAll} disabled={exporting}>
            {exporting ? "Préparation…" : "⬇️ Exporter (avec enregistrements audio)"}
          </button>
        </div>
        <p className="muted small">
          Le fichier exporté peut être envoyé au comité de langue (par WhatsApp, e-mail ou clé USB) pour validation et intégration dans la
          prochaine version du dictionnaire.
        </p>
        {p.contributions
          .slice()
          .reverse()
          .map((c) => (
            <div key={c.id} className="row" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <span className="badge">{KINDS.find((k) => k.id === c.kind)?.label}</span> <span className="mar">{c.word}</span> — {c.meaning}
                {c.example && <div className="small muted">{c.example}</div>}
                {c.village && <div className="small muted">📍 {c.village}</div>}
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => removeContribution(c.id)} aria-label="Supprimer">
                🗑
              </button>
            </div>
          ))}
      </section>
    </div>
  );
}

export default function ContributePage() {
  return (
    <Suspense>
      <ContributeInner />
    </Suspense>
  );
}
