/** Préparation du texte et du son pour la lecture vocale (fonctions pures, testées). */

/** Transforme une réponse Markdown en texte agréable à écouter. */
export function speechText(markdown: string): string {
  return markdown
    .split("\n")
    .filter((l) => !/^\s*📖/.test(l)) // liste des sources : utile à lire, pas à écouter
    .join("\n")
    .replace(/🟢\s*(élevé)?/g, "confiance élevée")
    .replace(/🟡\s*(moyen)?/g, "confiance moyenne")
    .replace(/🔴\s*(faible)?/g, "confiance faible")
    .replace(/⚠️/g, "Attention :")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)[_*]([^_*\n]+)[_*](?=\s|$|[.,;:!?)])/g, "$1$2")
    .replace(/^\s*#{1,6}\s*(.+)$/gm, "$1.")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\s*(?:→|=>|=)\s*/g, " : ")
    .replace(/«\s*|\s*»/g, '"')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/[.!?:;…]$/.test(l) ? l : `${l}.`))
    .join("\n")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/** Découpe un long texte en morceaux (par paragraphes puis par phrases). */
export function chunkText(text: string, max = 2200): string[] {
  const out: string[] = [];
  let cur = "";
  const push = () => {
    if (cur.trim()) out.push(cur.trim());
    cur = "";
  };
  for (const para of text.split("\n")) {
    const pieces = para.length > max ? para.split(/(?<=[.!?…])\s+/) : [para];
    for (const p of pieces) {
      if (cur.length + p.length + 1 > max) push();
      cur += (cur ? "\n" : "") + p.slice(0, max);
    }
  }
  push();
  return out;
}

/** Enveloppe un son PCM 16 bits (format renvoyé par Gemini) dans un fichier WAV lisible partout. */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1): Blob {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, pcm.length, true);
  return new Blob([header, pcm as BlobPart], { type: "audio/wav" });
}
