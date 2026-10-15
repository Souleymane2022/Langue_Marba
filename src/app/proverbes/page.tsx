"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/lib/data-client";
import { fold } from "@/lib/normalize";
import { AiBox } from "@/components/AiBox";
import { Loading, Recorder, SpeakFr } from "@/components/ui";

function ProverbsInner() {
  const { data, error } = useData();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(Number(params.get("p")) || null);

  useEffect(() => {
    if (open && data) document.getElementById(`p${open}`)?.scrollIntoView({ block: "center" });
    // uniquement au premier chargement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const f = fold(q);
    return f ? data.proverbs.filter((p) => fold(`${p.mar} ${p.fr}`).includes(f)) : data.proverbs;
  }, [data, q]);

  if (!data) return <Loading error={error} />;

  return (
    <div className="stack">
      <h1>🪶 Proverbes Marba</h1>
      <p className="muted">
        <span className="mar">Zlaɗa ɗogolã ki vun Marbana</span> — {data.proverbs.length} proverbes, la sagesse des anciens. Touchez un proverbe
        pour l&apos;écouter, l&apos;enregistrer ou le faire expliquer par l&apos;IA.
      </p>
      <input className="input" type="search" placeholder="Chercher un proverbe (Marba ou français)…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="stack" style={{ gap: 8 }}>
        {list.map((p) => (
          <div key={p.id} id={`p${p.id}`} className="card" style={{ borderColor: open === p.id ? "var(--primary)" : undefined }}>
            <button
              onClick={() => setOpen(open === p.id ? null : p.id)}
              style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", width: "100%" }}
              aria-expanded={open === p.id}
            >
              <span className="muted small">n° {p.id}</span>
              <div className="mar">{p.mar}</div>
              <div className="muted">{p.fr}</div>
            </button>
            {open === p.id && (
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="row">
                  <SpeakFr text={p.fr} />
                  <Recorder storageKey={`proverb:${p.id}`} />
                </div>
                <AiBox mode="proverbe" input={`${p.mar} (traduction du dictionnaire : ${p.fr})`} label="Expliquer ce proverbe" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProverbsPage() {
  return (
    <Suspense>
      <ProverbsInner />
    </Suspense>
  );
}
