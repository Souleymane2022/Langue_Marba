"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-client";
import { SECTOR_BY_ID, sectorEntries, sectorPhrases } from "@/lib/sectors";
import { enroll } from "@/lib/progress";
import { AI_MODE_BY_ID, type AiModeId } from "@/lib/ai-modes";
import { AiBox } from "@/components/AiBox";
import { EntryRow, ExampleView, Loading } from "@/components/ui";

const TOOLS: AiModeId[] = ["dialogue", "message", "fiche", "exercices"];

export default function SectorView({ id }: { id: string }) {
  const sector = SECTOR_BY_ID.get(id);
  const { data, error } = useData();
  const [tab, setTab] = useState<"mots" | "phrases" | "ia">("mots");
  const [tool, setTool] = useState<AiModeId>("dialogue");
  const [situation, setSituation] = useState(sector?.situations[0] ?? "");
  const [filter, setFilter] = useState("");

  const words = useMemo(() => (data && sector ? sectorEntries(data.dict.entries, sector) : []), [data, sector]);
  const phrases = useMemo(() => (data && sector ? sectorPhrases(data.dict.entries, sector, 120) : []), [data, sector]);

  if (!sector)
    return (
      <div className="notice">
        Secteur inconnu. <Link href="/secteurs">Voir les secteurs</Link>
      </div>
    );
  if (!data) return <Loading error={error} />;

  const shown = filter ? words.filter((w) => `${w.word} ${w.gloss}`.toLowerCase().includes(filter.toLowerCase())) : words;
  const mode = AI_MODE_BY_ID.get(tool)!;

  return (
    <div className="stack">
      <Link href="/secteurs" className="small no-print">
        ← Secteurs
      </Link>
      <h1>
        {sector.icon} {sector.name}
      </h1>
      <p className="muted">{sector.description}</p>
      <div className="row no-print">
        {(
          [
            ["mots", `📋 Vocabulaire (${words.length})`],
            ["phrases", `💬 Phrases (${phrases.length})`],
            ["ia", "✨ Outils IA"],
          ] as const
        ).map(([t, l]) => (
          <button key={t} className={`chip ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => window.print()}>
          🖨️ Imprimer le lexique
        </button>
      </div>

      {tab === "mots" && (
        <>
          <div className="row no-print">
            <input className="input" style={{ flex: 1 }} placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <button className="btn" onClick={() => enroll(words.slice(0, 20).map((w) => w.id))}>
              ＋ Réviser les 20 premiers
            </button>
            <Link className="btn btn-primary" href={`/apprendre/${sector.id}-1`}>
              Leçons
            </Link>
          </div>
          <div className="card" style={{ padding: "4px 12px" }}>
            {shown.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        </>
      )}

      {tab === "phrases" && (
        <div className="card">
          <p className="muted small">Phrases authentiques tirées des exemples du dictionnaire.</p>
          {phrases.map((p, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <ExampleView ex={p} />
              </div>
              <Link href={`/dictionnaire/${p.entryId}`} className="small no-print">
                mot →
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "ia" && (
        <div className="stack">
          <div className="row">
            {TOOLS.map((t) => {
              const m = AI_MODE_BY_ID.get(t)!;
              return (
                <button key={t} className={`chip ${tool === t ? "active" : ""}`} onClick={() => setTool(t)}>
                  {m.icon} {m.label}
                </button>
              );
            })}
          </div>
          <div className="card stack">
            <p className="muted small">{mode.description}</p>
            {tool === "dialogue" && (
              <div className="row">
                {sector.situations.map((s) => (
                  <button key={s} className={`chip ${situation === s ? "active" : ""}`} onClick={() => setSituation(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <textarea className="textarea" value={situation} onChange={(e) => setSituation(e.target.value)} placeholder={mode.placeholder} />
            <AiBox key={tool} mode={tool} input={situation} sector={sector.id} label={`Générer : ${mode.label.toLowerCase()}`} />
            <p className="small muted">
              ⚠️ Les phrases produites par l&apos;IA doivent être validées par un locuteur natif avant toute diffusion publique (radio,
              affiches, documents officiels).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
