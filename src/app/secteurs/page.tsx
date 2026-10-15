"use client";

import Link from "next/link";
import { useData } from "@/lib/data-client";
import { SECTORS, sectorEntries } from "@/lib/sectors";

export default function SectorsPage() {
  const { data } = useData();
  return (
    <div className="stack">
      <h1>Le Marba dans les secteurs de base</h1>
      <p className="muted">
        Vocabulaire essentiel, phrases authentiques et outils IA (dialogues, messages de sensibilisation, fiches pédagogiques) pour
        utiliser la langue Marba là où elle compte : soins, école, champs, marché, chefferie et administration.
      </p>
      <div className="grid">
        {SECTORS.map((s) => (
          <Link key={s.id} href={`/secteurs/${s.id}`} className="tile">
            <span className="icon">{s.icon}</span>
            <strong>{s.name}</strong>
            <p>{s.description}</p>
            {data && <span className="badge" style={{ alignSelf: "flex-start" }}>{sectorEntries(data.dict.entries, s).length} mots</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
