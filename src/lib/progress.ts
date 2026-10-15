"use client";

import { useSyncExternalStore } from "react";
import { newCard, review, type CardState, type Grade } from "./srs.ts";

/** Progression de l'apprenant, conservée sur l'appareil (fonctionne hors-ligne). */
export interface Contribution {
  id: string;
  kind: "mot" | "correction" | "exemple" | "proverbe";
  word: string;
  meaning: string;
  example?: string;
  note?: string;
  village?: string;
  author?: string;
  entryId?: string;
  createdAt: number;
}

export interface QuizResult {
  at: number;
  label: string;
  score: number;
  total: number;
}

export interface Progress {
  xp: number;
  /** jours d'activité au format AAAA-MM-JJ */
  days: string[];
  srs: Record<string, CardState>;
  favorites: string[];
  lessons: Record<string, { best: number; total: number; at: number }>;
  quizzes: QuizResult[];
  contributions: Contribution[];
  profile: { name: string; goal: "decouvrir" | "parler" | "enseigner" | "professionnel"; dailyTarget: number };
}

const KEY = "marba:progress:v1";
const EMPTY: Progress = {
  xp: 0,
  days: [],
  srs: {},
  favorites: [],
  lessons: {},
  quizzes: [],
  contributions: [],
  profile: { name: "", goal: "parler", dailyTarget: 10 },
};

let state: Progress = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): Progress {
  if (typeof window === "undefined") return EMPTY;
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
    } catch {
      state = EMPTY;
    }
  }
  return state;
}

function write(next: Progress) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage plein ou désactivé : la progression reste en mémoire */
  }
  listeners.forEach((l) => l());
}

export function update(fn: (p: Progress) => Progress) {
  write(fn(read()));
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function touch(p: Progress): Progress {
  const t = today();
  return p.days.includes(t) ? p : { ...p, days: [...p.days, t].slice(-400) };
}

export function addXp(amount: number) {
  update((p) => touch({ ...p, xp: p.xp + amount }));
}

export function streak(days: string[]): number {
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1); // la série n'est pas perdue avant minuit
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function toggleFavorite(id: string) {
  update((p) => ({
    ...p,
    favorites: p.favorites.includes(id) ? p.favorites.filter((f) => f !== id) : [...p.favorites, id],
  }));
}

/** Ajoute des mots au paquet de révision (s'ils n'y sont pas déjà). */
export function enroll(ids: string[]) {
  update((p) => {
    const srs = { ...p.srs };
    for (const id of ids) if (!srs[id]) srs[id] = newCard();
    return { ...p, srs };
  });
}

export function gradeCard(id: string, grade: Grade) {
  update((p) => {
    const card = p.srs[id] ?? newCard();
    return touch({ ...p, xp: p.xp + (grade >= 3 ? 2 : 0), srs: { ...p.srs, [id]: review(card, grade) } });
  });
}

export function recordLesson(lessonId: string, score: number, total: number) {
  update((p) => {
    const prev = p.lessons[lessonId];
    const best = Math.max(prev?.best ?? 0, score);
    return touch({
      ...p,
      xp: p.xp + score * 5,
      lessons: { ...p.lessons, [lessonId]: { best, total, at: Date.now() } },
      quizzes: [...p.quizzes, { at: Date.now(), label: lessonId, score, total }].slice(-200),
    });
  });
}

export function recordQuiz(label: string, score: number, total: number) {
  update((p) =>
    touch({
      ...p,
      xp: p.xp + score * 3,
      quizzes: [...p.quizzes, { at: Date.now(), label, score, total }].slice(-200),
    }),
  );
}

export function addContribution(c: Omit<Contribution, "id" | "createdAt">) {
  update((p) =>
    touch({
      ...p,
      xp: p.xp + 10,
      contributions: [...p.contributions, { ...c, id: crypto.randomUUID(), createdAt: Date.now() }],
    }),
  );
}

export function removeContribution(id: string) {
  update((p) => ({ ...p, contributions: p.contributions.filter((c) => c.id !== id) }));
}

export function setProfile(profile: Progress["profile"]) {
  update((p) => ({ ...p, profile }));
}

export function exportProgress(): string {
  return JSON.stringify(read(), null, 2);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json) as Partial<Progress>;
  if (typeof parsed !== "object" || parsed === null || typeof parsed.xp !== "number") {
    throw new Error("Fichier de progression invalide");
  }
  write({ ...EMPTY, ...parsed });
}
