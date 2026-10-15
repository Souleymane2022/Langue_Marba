"use client";

import { useEffect, useState } from "react";
import { withBase } from "./base-path.ts";
import { buildIndex, type SearchIndex } from "./search.ts";
import { buildCourses, type Course } from "./lessons.ts";
import type { Dictionary, Proverb } from "./types.ts";

export interface AppData {
  dict: Dictionary;
  proverbs: Proverb[];
  index: SearchIndex;
  courses: Course[];
}

let pending: Promise<AppData> | null = null;
let loaded: AppData | null = null;

/** Charge (une seule fois) le dictionnaire servi statiquement — mis en cache par le service worker pour l'usage hors-ligne. */
export function loadData(): Promise<AppData> {
  if (!pending) {
    pending = Promise.all([
      fetch(withBase("/data/dictionary.json")).then((r) => {
        if (!r.ok) throw new Error(`dictionnaire indisponible (${r.status})`);
        return r.json() as Promise<Dictionary>;
      }),
      fetch(withBase("/data/proverbs.json")).then((r) => (r.ok ? (r.json() as Promise<Proverb[]>) : [])),
    ])
      .then(([dict, proverbs]) => {
        loaded = { dict, proverbs, index: buildIndex(dict.entries), courses: buildCourses(dict.entries) };
        return loaded;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

export function useData(): { data: AppData | null; error: string | null } {
  const [data, setData] = useState<AppData | null>(loaded);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (loaded) return;
    let alive = true;
    loadData()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}

/** Indice stable pour « le mot du jour » et « le proverbe du jour ». */
export function dayIndex(modulo: number, salt = 0): number {
  const d = new Date();
  const n = d.getFullYear() * 1000 + Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  return (((n * 2654435761 + salt) >>> 0) % Math.max(modulo, 1)) | 0;
}
