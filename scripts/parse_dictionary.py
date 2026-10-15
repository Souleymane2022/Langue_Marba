#!/usr/bin/env python3
"""Convertit le dictionnaire Marba (.docx) en données JSON pour l'application.

Usage :
    python3 scripts/parse_dictionary.py chemin/vers/Dictionnaire_Marba.docx

Produit :
    src/data/dictionary.json   (entrées du dictionnaire)
    src/data/proverbs.json     (proverbes « Zlaɗa ɗogolã ki vun Marbana »)
    + une copie de chaque fichier dans public/data/

Conventions du document source :
  * paragraphe en gras      -> nouvelle entrée (mot vedette + formes + catégorie)
  * paragraphe en italique  -> traduction / sens principal
  * « *expr : sens »         -> expression ou mot composé
  * « Marba : français. »    -> exemple d'emploi
"""
import json
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data"          # importé côté serveur (assistant IA)
PUBLIC = ROOT / "public" / "data"    # chargé par le navigateur, mis en cache hors-ligne

LETTERS = {
    "A", "B", "Ɓ", "C", "D", "Ɗ", "E", "Ə", "F", "G", "H", "Ɦ", "I", "Ɨ", "J", "K", "L", "M", "MB",
    "N", "ND", "NG", "NJ", "Ŋ", "O", "P", "R", "S", "SL", "T", "U", "V", "W", "Y", "Z", "ZL",
}
PROVERBS_TITLE = "ZLAƊA ƊOGOLÃ KI VUN MARBANA"

# Catégories grammaticales : (motif, code, libellé)
POS_PATTERNS = [
    (r"n\.?\s*zoo", "n.zoo", "nom (zoologie)"),
    (r"n\.?\s*bot", "n.bot", "nom (botanique)"),
    (r"n\.?\s*anat", "n.anat", "nom (anatomie)"),
    (r"n\.?\s*m[ée]d", "n.med", "nom (médecine)"),
    (r"n\.?\s*rel|pl\.?\s*rel", "n.rel", "nom (parenté)"),
    (r"n\.?\s*prop|propre", "n.prop", "nom propre"),
    (r"\bnum", "num", "numéral"),
    (r"\badv", "adv", "adverbe"),
    (r"\bpr[ée]p|\bpre\.", "prep", "préposition"),
    (r"\bconj", "conj", "conjonction"),
    (r"\binterj|\bexcl", "interj", "interjection"),
    (r"\bid\.", "id", "idéophone"),
    (r"\bpr\.?\s*pers|\bpron", "pron", "pronom"),
    (r"\badj", "adj", "adjectif"),
    (r"\bquant", "quant", "quantificateur"),
    (r"\bn[ée]g", "neg", "négation"),
    (r"\bint\.|\binter", "int", "interrogatif"),
    (r"\bloc\.", "loc", "localisateur"),
    (r"\bv\.?(?:\s|$|,)|\bv\.$|\bv$", "v", "verbe"),
    (r"\bn\.?(?:\s|$|,|\.)|\bn$", "n", "nom"),
]

SECTOR_LABEL = {
    "n.zoo": "faune", "n.bot": "flore", "n.anat": "corps", "n.med": "sante", "n.rel": "famille",
}


def para_runs(p):
    runs = []
    for r in p.iter(W + "r"):
        text = "".join(t.text or "" for t in r.iter(W + "t"))
        if not text:
            continue
        rpr = r.find(W + "rPr")
        bold = italic = False
        if rpr is not None:
            b, i = rpr.find(W + "b"), rpr.find(W + "i")
            bold = b is not None and b.get(W + "val") not in ("0", "false")
            italic = i is not None and i.get(W + "val") not in ("0", "false")
        runs.append((text, bold, italic))
    return runs


def clean(s):
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def detect_pos(head):
    low = head.lower()
    found = []
    for pat, code, label in POS_PATTERNS:
        if re.search(pat, low) and code not in [c for c, _ in found]:
            # « n. » est englobé par les sous-catégories de nom
            if code == "n" and any(c.startswith("n.") for c, _ in found):
                continue
            found.append((code, label))
    return found


def split_headword(head):
    """« Abar, abara sg, abureina pl.n.zoo. » -> ('Abar', ['abara', 'abureina'])"""
    h = re.sub(r"\(.*?\)", "", head)
    # coupe au premier marqueur grammatical
    m = re.search(
        r"[\s,.](?:n\.|n\s|v\.|v\s|adv|pr[ée]p|excl|conj|interj|id\.|num|pr\.|sg\b|pl\b|adj|quant|neg|int\.|loc\.|cf\.)",
        h + " ", flags=re.I,
    )
    base = h[: m.start()] if m else h
    parts = [clean(x).strip(" .,;") for x in re.split(r",", base)]
    parts = [p for p in parts if p]
    if not parts:
        parts = [clean(h).split(" ")[0].strip(" .,")]
    # « Ja ja'a v. » (sans virgule) -> deux formes
    first = parts[0].split(" ")
    if len(first) == 2 and not any(c.isdigit() for c in parts[0]):
        parts = [first[0], first[1]] + parts[1:]
    return parts[0], parts[1:]


EX_SPLIT = re.compile(r"(?<=[.?!])\s+(?=[A-ZÀ-ÖØ-ÞƁƊƎƏƐƗŊƦ*ƁƊƆ])")


def split_examples(line):
    """Découpe « Mar1 : fr1. Mar2 : fr2. » en paires (marba, français)."""
    out = []
    for chunk in EX_SPLIT.split(line):
        chunk = chunk.strip()
        if " : " in chunk or ": " in chunk:
            mar, fr = re.split(r"\s*:\s+", chunk, maxsplit=1)
            mar, fr = clean(mar), clean(fr)
            if mar and fr:
                out.append({"mar": mar, "fr": fr})
                continue
        if out and chunk:
            # suite de la traduction précédente
            out[-1]["fr"] = clean(out[-1]["fr"] + " " + chunk)
    return out


def ascii_fold(s):
    s = s.lower()
    repl = {"ɓ": "b", "ɗ": "d", "ŋ": "ng", "ɦ": "h", "ə": "e", "ɨ": "i", "’": "'", "ƴ": "y"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def slug(s, seen):
    base = re.sub(r"[^a-z0-9]+", "-", ascii_fold(s)).strip("-") or "mot"
    n, cand = 1, base
    while cand in seen:
        n += 1
        cand = f"{base}-{n}"
    seen.add(cand)
    return cand


def main(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")

    entries, proverbs = [], []
    intro = []
    cur = None
    letter = None
    in_proverbs = False
    seen = set()

    def flush():
        nonlocal cur
        if cur:
            entries.append(cur)
        cur = None

    def add_proverb(piece):
        m = re.match(r"^(\d+)\s*\.\s*(.+)$", piece)
        if not m:
            return
        body_txt = m.group(2)
        mar, _, fr = body_txt.partition(" : ")
        if not fr:
            mar, _, fr = body_txt.partition(": ")
        if not fr:
            # « Marba ! Traduction. » : séparation sur la ponctuation finale
            parts = re.split(r"(?<=[!?.])\s+(?=[A-ZÀ-Ý“«])", body_txt, maxsplit=1)
            mar, fr = (parts + [""])[:2]
        proverbs.append({"id": int(m.group(1)), "mar": clean(mar), "fr": clean(fr)})

    for el in body:
        if el.tag != W + "p":
            continue
        runs = para_runs(el)
        text = clean("".join(t for t, _, _ in runs))
        if not text:
            continue
        if text.upper() == PROVERBS_TITLE:
            flush()
            in_proverbs = True
            continue
        if in_proverbs:
            for piece in re.split(r"\s+(?=\d{1,3}\.\s)", text):
                add_proverb(piece)
            continue
        if text.upper() in LETTERS and len(text) <= 2 and runs[0][1]:
            flush()
            letter = text.upper()
            continue
        if letter is None:
            intro.append(text)
            continue

        starts_bold = runs[0][1] and len(runs[0][0].strip()) > 0
        if starts_bold and not text.startswith("*"):
            flush()
            head = text
            hw, forms = split_headword(head)
            pos = detect_pos(head)
            cur = {
                "id": slug(hw, seen),
                "word": hw,
                "forms": forms,
                "pos": [c for c, _ in pos],
                "posLabel": ", ".join(l for _, l in pos),
                "letter": letter,
                "head": head,
                "gloss": "",
                "definition": [],
                "examples": [],
                "expressions": [],
            }
            continue
        if cur is None:
            continue

        all_italic = all(i for t, _, i in runs if t.strip())
        if all_italic and not cur["gloss"]:
            cur["gloss"] = text.rstrip(" .")
            continue
        if text.startswith("*"):
            t = text.lstrip("* ")
            mar, sep, fr = t.partition(":")
            if sep:
                cur["expressions"].append({"mar": clean(mar), "fr": clean(fr)})
            else:
                cur["definition"].append(t)
            continue
        if re.match(r"^\d+\.\s", text) and " : " not in text:
            cur["definition"].append(text)
            continue
        if " : " in text or ": " in text:
            exs = split_examples(text)
            if exs:
                cur["examples"].extend(exs)
                continue
        if not cur["gloss"]:
            cur["gloss"] = text.rstrip(" .")
        else:
            cur["definition"].append(text)
    flush()

    # Entrées sans glose explicite : on prend la première définition ou la traduction
    for e in entries:
        if not e["gloss"] and e["definition"]:
            e["gloss"] = e["definition"].pop(0)
        e["gloss"] = re.sub(r"^\d+\.\s*", "", e["gloss"]).strip()
        for c in e["pos"]:
            if c in SECTOR_LABEL:
                e.setdefault("tags", []).append(SECTOR_LABEL[c])

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "title": "Dictionnaire Marba – Français",
        "source": "Dictionnaire Marba (Akaki)",
        "introduction": intro[1:3] if len(intro) > 2 else intro,
        "alphabet": "a b ɓ c d ɗ e ə f g h ɦ i ɨ j k l m mb n ng nj ŋ o p r s sl t u v w y z zl ’".split(),
        "entryCount": len(entries),
        "exampleCount": sum(len(e["examples"]) for e in entries),
        "proverbCount": len(proverbs),
    }
    (OUT / "dictionary.json").write_text(
        json.dumps({"meta": meta, "entries": entries}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    (OUT / "proverbs.json").write_text(json.dumps(proverbs, ensure_ascii=False, indent=1), encoding="utf-8")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for name in ("dictionary.json", "proverbs.json"):
        (PUBLIC / name).write_bytes((OUT / name).read_bytes())
    print(f"{len(entries)} entrées, {meta['exampleCount']} exemples, {len(proverbs)} proverbes")


if __name__ == "__main__":
    main(sys.argv[1])
